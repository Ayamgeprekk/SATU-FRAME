import { TimeSyncClient } from '../src/lib/sync/time-sync';
import { PHOTO_TEMPLATES, getTemplateById } from '../src/lib/render/templates';
import { sessionStateManager } from '../src/server/state-machine';

function runTests() {
  console.log('--- Testing Satu Frame Core Engines ---');

  // Test 1: Template Slot Boundaries
  console.log('\n[1] Verifying Template Canvas & Slot Boundaries...');
  for (const template of PHOTO_TEMPLATES) {
    const totalMP = (template.canvasWidth * template.canvasHeight) / 1_000_000;
    console.log(`- ${template.name}: ${template.canvasWidth}x${template.canvasHeight} (${totalMP.toFixed(2)} MP)`);
    if (totalMP > 8.0) {
      throw new Error(`Template ${template.id} exceeds 8MP mobile safety limit!`);
    }

    for (const slot of template.slots) {
      if (slot.x < 0 || slot.y < 0) {
        throw new Error(`Slot ${slot.index} in ${template.id} has negative coordinates!`);
      }
      if (slot.x + slot.width > template.canvasWidth) {
        throw new Error(`Slot ${slot.index} exceeds canvas width!`);
      }
      if (slot.y + slot.height > template.canvasHeight) {
        throw new Error(`Slot ${slot.index} exceeds canvas height!`);
      }
    }
  }
  console.log('Template Slot Boundaries: PASS');

  // Test 2: NTP Time Sync Median Filter
  console.log('\n[2] Testing NTP Time Sync Engine (PRD §9.2 Lapis 1)...');
  const simulatedServerOffset = 1250; // Server is 1250ms ahead

  const client = new TimeSyncClient((clientTime) => {});

  // Feed 8 samples with varying network RTT jitter
  const mockPings = [
    { t0: 1000, rtt: 40 },
    { t0: 1100, rtt: 120 }, // jitter spike
    { t0: 1200, rtt: 35 },  // low hop
    { t0: 1300, rtt: 38 },
    { t0: 1400, rtt: 42 },
    { t0: 1500, rtt: 300 }, // huge lag spike (outlier)
    { t0: 1600, rtt: 36 },
    { t0: 1700, rtt: 39 },
  ];

  for (const p of mockPings) {
    const ts = p.t0 + simulatedServerOffset + p.rtt / 2;
    client.handlePong(p.t0, ts, p.t0 + p.rtt);
  }

  const calculatedOffset = client.getOffset();
  console.log(`- Simulated Server Offset: ${simulatedServerOffset}ms`);
  console.log(`- Estimated Client Offset: ${calculatedOffset}ms`);
  console.log(`- Error Delta: ${Math.abs(calculatedOffset - simulatedServerOffset)}ms`);

  if (Math.abs(calculatedOffset - simulatedServerOffset) > 5) {
    throw new Error('NTP Median filter offset error exceeds 5ms threshold!');
  }
  console.log('NTP Time Sync: PASS');

  // Test 3: Session State Machine & Ready Gate (PRD §9.4 & §11)
  console.log('\n[3] Testing Session State Transitions & Disconnect Recovery...');
  const { session: initSession, creatorToken } = sessionStateManager.createSession('classic_strip');
  const sessionId = initSession.id;

  let s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Created Session ${s.id}, roomCode: ${s.roomCode}, state: ${s.state}`);
  if (s.state !== 'WAITING') throw new Error('Initial state must be WAITING');

  // Partner joins
  const { participant: partner } = sessionStateManager.joinSession(sessionId, 'Partner Rara');
  s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Partner joined (${partner.displayName}), state: ${s.state}`);
  if (s.state !== 'CONNECTED') throw new Error('State must transition to CONNECTED on partner join');

  // Creator ready
  sessionStateManager.setParticipantReady(sessionId, creatorToken, {
    ready: true,
    deviceLagMs: 80,
    offsetMs: 5,
    tabVisible: true,
    wsRttMs: 35,
  });
  s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Creator ready. Session state: ${s.state} (Waiting for partner)`);
  if (s.state === 'READY') throw new Error('Session should not be READY before partner is ready');

  // Partner ready -> Ready Gate passes!
  const readyGatePassed = sessionStateManager.setParticipantReady(sessionId, partner.id, {
    ready: true,
    deviceLagMs: 95,
    offsetMs: 12,
    tabVisible: true,
    wsRttMs: 40,
  });
  s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Partner ready. Ready Gate Passed: ${readyGatePassed}, State: ${s.state}`);
  if (s.state !== 'READY') throw new Error('State must be READY when both pass Ready Gate');

  // Schedule capture
  const schedule = sessionStateManager.scheduleCapture(sessionId);
  s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Scheduled Capture: Shot #${schedule?.shotNo}, Target Time in ${schedule ? schedule.tTargetServer - Date.now() : 0}ms`);
  if (s.state !== 'COUNTDOWN') throw new Error('State must transition to COUNTDOWN');

  // Disconnect simulation during countdown
  sessionStateManager.handleDisconnect(sessionId, partner.id);
  s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Partner disconnected. State: ${s.state}`);
  if (s.state !== 'RECONNECTING') throw new Error('State must be RECONNECTING upon disconnect');

  // Reconnect simulation
  sessionStateManager.handleReconnect(sessionId, partner.id);
  s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Partner reconnected. State restored: ${s.state}`);
  if (s.state !== 'CONNECTED' && s.state !== 'READY') {
    throw new Error('State must restore properly after reconnect');
  }

  console.log('Session State Machine: PASS');

  // Test 4: CAPTURE_ABORT when tab hidden during countdown (P1-01)
  console.log('\n[4] Testing CAPTURE_ABORT Tab Background Behavior (P1-01)...');
  sessionStateManager.setParticipantReady(sessionId, creatorToken, { ready: true, tabVisible: true });
  sessionStateManager.setParticipantReady(sessionId, partner.id, { ready: true, tabVisible: true });
  sessionStateManager.scheduleCapture(sessionId);
  s = sessionStateManager.getSession(sessionId)!;
  if (s.state !== 'COUNTDOWN') throw new Error('State must be COUNTDOWN before abort');

  const aborted = sessionStateManager.abortCountdown(sessionId, partner.id, 'tab_hidden');
  s = sessionStateManager.getSession(sessionId)!;
  console.log(`- Capture aborted (tab_hidden). State: ${s.state}, Success: ${aborted}`);
  if (!aborted || s.state !== 'CONNECTED') throw new Error('State must return to CONNECTED on tab_hidden abort');
  console.log('CAPTURE_ABORT: PASS');

  // Test 5: System Desync Retry separation from user quota (AMB-01)
  console.log('\n[5] Testing System Retry vs User Retake Separation (AMB-01)...');
  const retry1 = sessionStateManager.recordSystemRetry(sessionId);
  const retry2 = sessionStateManager.recordSystemRetry(sessionId);
  const retry3 = sessionStateManager.recordSystemRetry(sessionId);
  const retry4 = sessionStateManager.recordSystemRetry(sessionId); // Should fail (>3)
  console.log(`- Retries: #1=${retry1.canRetry}, #2=${retry2.canRetry}, #3=${retry3.canRetry}, #4=${retry4.canRetry}`);
  if (!retry1.canRetry || !retry2.canRetry || !retry3.canRetry || retry4.canRetry) {
    throw new Error('System retry must allow max 3 desync retries per shot');
  }
  console.log('System Retry Quota: PASS');

  console.log('\nALL CORE TESTS PASSED!');
}

runTests();
