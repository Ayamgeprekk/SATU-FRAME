import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { sessionStateManager } from './src/server/state-machine';
import { startBackgroundCleanupScheduler } from './src/server/cleanup-job';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || '3000', 10);

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  participantId: string;
  isAlive: boolean;
}

const roomClients = new Map<string, ClientConnection[]>(); // sessionId -> ClientConnection[]

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket Upgrade
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Broadcast helper to room peers
  function broadcastToRoom(sessionId: string, message: any, excludeWs?: WebSocket) {
    const clients = roomClients.get(sessionId) || [];
    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    let clientSessionId = '';
    let clientParticipantId = '';

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, eventId, payload } = msg;

        switch (type) {
          // 1. Time Synchronization Ping-Pong (PRD §9.2 Lapis 1)
          case 'TIME_PING': {
            ws.send(
              JSON.stringify({
                type: 'TIME_PONG',
                eventId,
                payload: {
                  t0: payload.t0,
                  ts: Date.now(),
                },
                timestamp: Date.now(),
              })
            );
            break;
          }

          // 2. Client joins room
          case 'JOIN_ROOM': {
            clientSessionId = payload.sessionId;
            clientParticipantId = payload.participantId;

            const existingClients = roomClients.get(clientSessionId) || [];
            // Remove previous stale connection of same participant if any
            const filtered = existingClients.filter((c) => c.participantId !== clientParticipantId);
            filtered.push({ ws, sessionId: clientSessionId, participantId: clientParticipantId, isAlive: true });
            roomClients.set(clientSessionId, filtered);

            // Notify session state manager of reconnect
            const session = sessionStateManager.handleReconnect(clientSessionId, clientParticipantId);
            const participants = sessionStateManager.getParticipants(clientSessionId);

            // Send full authoritative snapshot to joining client
            ws.send(
              JSON.stringify({
                type: 'STATE_SNAPSHOT',
                payload: {
                  session,
                  participants,
                  photos: sessionStateManager.getPhotos(clientSessionId),
                },
                timestamp: Date.now(),
              })
            );

            // Broadcast presence to peer
            broadcastToRoom(clientSessionId, {
              type: 'PRESENCE',
              payload: { participants },
              timestamp: Date.now(),
            });
            break;
          }

          // 3. WebRTC P2P Signaling Relay (Offer, Answer, ICE candidate)
          case 'WEBRTC_SIGNAL': {
            if (!clientSessionId) return;
            broadcastToRoom(
              clientSessionId,
              {
                type: 'WEBRTC_SIGNAL',
                payload: {
                  from: clientParticipantId,
                  signal: payload.signal,
                },
                timestamp: Date.now(),
              },
              ws
            );
            break;
          }

          // 3b. Update Session Template
          case 'UPDATE_TEMPLATE': {
            if (!clientSessionId || !payload?.templateId) return;
            const updated = sessionStateManager.updateTemplate(clientSessionId, payload.templateId);
            if (updated) {
              broadcastToRoom(clientSessionId, {
                type: 'STATE_SNAPSHOT',
                payload: {
                  session: updated,
                  participants: sessionStateManager.getParticipants(clientSessionId),
                  photos: sessionStateManager.getPhotos(clientSessionId),
                },
                timestamp: Date.now(),
              });
            }
            break;
          }

          // 4. Participant Ready Gate (PRD §9.4)
          case 'READY': {
            if (!clientSessionId || !clientParticipantId) return;

            const readyGateTriggered = sessionStateManager.setParticipantReady(
              clientSessionId,
              clientParticipantId,
              payload
            );

            const session = sessionStateManager.getSession(clientSessionId);
            const participants = sessionStateManager.getParticipants(clientSessionId);

            broadcastToRoom(clientSessionId, {
              type: 'PRESENCE',
              payload: { participants, session },
              timestamp: Date.now(),
            });

            // If both participants are ready, trigger countdown capture schedule
            if (readyGateTriggered) {
              const schedule = sessionStateManager.scheduleCapture(clientSessionId);
              if (schedule) {
                broadcastToRoom(clientSessionId, {
                  type: 'SCHEDULE_CAPTURE',
                  payload: {
                    shotNo: schedule.shotNo,
                    tTargetServer: schedule.tTargetServer,
                    stateVersion: session?.stateVersion,
                  },
                  timestamp: Date.now(),
                });
              }
            }
            break;
          }

          // 5. Retake Request
          case 'RETAKE_REQUEST': {
            if (!clientSessionId) return;
            const success = sessionStateManager.requestRetake(clientSessionId, payload.shotNo);
            if (success) {
              const session = sessionStateManager.getSession(clientSessionId);
              broadcastToRoom(clientSessionId, {
                type: 'STATE_SNAPSHOT',
                payload: {
                  session,
                  participants: sessionStateManager.getParticipants(clientSessionId),
                  photos: sessionStateManager.getPhotos(clientSessionId),
                },
                timestamp: Date.now(),
              });
            }
            break;
          }

          // 6. Capture Abort (P1-01: Tab hidden / background during countdown)
          case 'CAPTURE_ABORT': {
            if (!clientSessionId) return;
            const aborted = sessionStateManager.abortCountdown(
              clientSessionId,
              clientParticipantId,
              payload.reason || 'tab_hidden'
            );
            if (aborted) {
              const session = sessionStateManager.getSession(clientSessionId);
              const participants = sessionStateManager.getParticipants(clientSessionId);
              broadcastToRoom(clientSessionId, {
                type: 'CAPTURE_ABORT',
                payload: {
                  session,
                  participants,
                  reason: payload.reason || 'tab_hidden',
                  abortedBy: clientParticipantId,
                },
                timestamp: Date.now(),
              });
            }
            break;
          }

          // 7. Compositing Keepalive (REC-03: Keep session alive during heavy toBlob compression)
          case 'COMPOSITING_KEEPALIVE': {
            if (!clientSessionId) return;
            sessionStateManager.handleCompositingKeepalive(clientSessionId, clientParticipantId);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      if (clientSessionId && clientParticipantId) {
        sessionStateManager.handleDisconnect(clientSessionId, clientParticipantId);
        const existingClients = roomClients.get(clientSessionId) || [];
        const updated = existingClients.filter((c) => c.ws !== ws);
        roomClients.set(clientSessionId, updated);

        const session = sessionStateManager.getSession(clientSessionId);
        broadcastToRoom(clientSessionId, {
          type: 'PRESENCE',
          payload: {
            disconnectedParticipantId: clientParticipantId,
            session,
            state: 'RECONNECTING',
          },
          timestamp: Date.now(),
        });
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Satu Frame server ready on http://localhost:${port}`);
    console.log(`> WebSocket signaling listening on ws://localhost:${port}/ws`);
    startBackgroundCleanupScheduler();
  });
});
