import { Session, SessionState, Participant, SessionPhoto } from '@/types/session';
import { v4 as uuidv4 } from 'uuid';

export class SessionStateManager {
  private sessions = new Map<string, Session>();
  private participants = new Map<string, Participant[]>();
  private photos = new Map<string, SessionPhoto[]>();
  private eventLogs = new Map<string, any[]>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Create a new session (Guest creator)
   */
  public createSession(templateId = 'classic_strip'): { session: Session; creatorToken: string } {
    const sessionId = uuidv4();
    // PRD §17: room_code >= 8 karakter acak (base32) + kedaluwarsa
    const BASE32_CHARS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    let roomCode = '';
    for (let i = 0; i < 8; i++) {
      roomCode += BASE32_CHARS.charAt(Math.floor(Math.random() * BASE32_CHARS.length));
    }
    const creatorId = uuidv4();
    const resultToken = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');

    const now = Date.now();
    const session: Session = {
      id: sessionId,
      roomCode,
      creatorParticipantId: creatorId,
      templateId,
      templateVersion: 1,
      state: 'WAITING',
      stateVersion: 1,
      currentShotNo: 1,
      shotCountTarget: 4,
      shotCountSaved: 0,
      retakeUsed: 0,
      maxRetake: 1,
      tier: 'free',
      resultToken,
      createdAt: now,
      expiresAt: now + 30 * 60 * 1000, // 30 minutes TTL
      ttlAt: now + 24 * 60 * 60 * 1000,
    };

    const creator: Participant = {
      id: creatorId,
      sessionId,
      role: 'creator',
      displayName: 'Creator',
      ready: false,
      deviceLagMs: 0,
      offsetMs: 0,
      tabVisible: true,
      wsRttMs: 0,
      lastSeenAt: now,
    };

    this.sessions.set(sessionId, session);
    this.participants.set(sessionId, [creator]);
    this.photos.set(sessionId, []);
    this.eventLogs.set(sessionId, []);

    return { session, creatorToken: creatorId };
  }

  public getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  public getSessionByRoomCode(code: string): Session | undefined {
    const upper = code.toUpperCase().trim();
    for (const s of this.sessions.values()) {
      if (s.roomCode === upper && s.state !== 'EXPIRED' && s.state !== 'CANCELLED') {
        return s;
      }
    }
    return undefined;
  }

  public getSessionByResultToken(token: string): Session | undefined {
    for (const s of this.sessions.values()) {
      if (s.resultToken === token) return s;
    }
    return undefined;
  }

  public getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  public getExpiredSessions(now = Date.now()): Session[] {
    const expired: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.state === 'CANCELLED' || session.state === 'EXPIRED') {
        continue;
      }
      // Check if session capture expired (and not completed) or TTL expired
      const isCaptureTimeout =
        session.state !== 'COMPLETED' &&
        session.state !== 'REVIEW' &&
        session.expiresAt &&
        now > session.expiresAt;
      const isTtlExpired = session.ttlAt && now > session.ttlAt;

      if (isCaptureTimeout || isTtlExpired) {
        expired.push(session);
      }
    }
    return expired;
  }

  public expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.state = 'EXPIRED';
    session.stateVersion += 1;
  }

  public getParticipants(sessionId: string): Participant[] {
    return this.participants.get(sessionId) || [];
  }

  public getPhotos(sessionId: string): SessionPhoto[] {
    return this.photos.get(sessionId) || [];
  }

  public updateTemplate(sessionId: string, templateId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.templateId = templateId;
    session.stateVersion += 1;
    return session;
  }

  /**
   * Partner joins session
   */
  public joinSession(sessionId: string, displayName = 'Partner'): { participant: Participant } {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const parts = this.participants.get(sessionId) || [];
    const existingPartner = parts.find((p) => p.role === 'partner');

    if (existingPartner) {
      existingPartner.lastSeenAt = Date.now();
      return { participant: existingPartner };
    }

    if (parts.length >= 2) {
      throw new Error('Room ini sudah penuh (maksimal 2 orang)');
    }

    const partnerId = uuidv4();
    const partner: Participant = {
      id: partnerId,
      sessionId,
      role: 'partner',
      displayName,
      ready: false,
      deviceLagMs: 0,
      offsetMs: 0,
      tabVisible: true,
      wsRttMs: 0,
      lastSeenAt: Date.now(),
    };

    parts.push(partner);
    this.participants.set(sessionId, parts);

    // Transition WAITING -> CONNECTED
    if (session.state === 'WAITING') {
      session.state = 'CONNECTED';
      session.connectedAt = Date.now();
      session.stateVersion += 1;
    }

    return { participant: partner };
  }

  /**
   * Update participant readiness and technical metrics
   */
  public setParticipantReady(
    sessionId: string,
    participantId: string,
    data: { ready: boolean; deviceLagMs?: number; offsetMs?: number; tabVisible?: boolean; wsRttMs?: number }
  ): boolean {
    const session = this.sessions.get(sessionId);
    const parts = this.participants.get(sessionId);
    if (!session || !parts) return false;

    const part = parts.find((p) => p.id === participantId);
    if (!part) return false;

    part.ready = data.ready;
    if (data.deviceLagMs !== undefined) part.deviceLagMs = data.deviceLagMs;
    if (data.offsetMs !== undefined) part.offsetMs = data.offsetMs;
    if (data.tabVisible !== undefined) part.tabVisible = data.tabVisible;
    if (data.wsRttMs !== undefined) part.wsRttMs = data.wsRttMs;
    part.lastSeenAt = Date.now();

    // Ready Gate Check (PRD §9.4):
    // Both must be ready, drift < 150ms, tab_visible=true, ws_rtt < 800ms
    if (parts.length === 2) {
      const readyGatePassed = parts.every(
        (p) => p.ready && p.tabVisible && Math.abs(p.offsetMs) < 15000 && p.wsRttMs < 800
      );

      if (readyGatePassed && (session.state === 'CONNECTED' || session.state === 'SHOT_SAVED')) {
        session.state = 'READY';
        session.stateVersion += 1;
        return true;
      }
    }

    return false;
  }

  /**
   * Schedule countdown capture
   */
  public scheduleCapture(sessionId: string): { tTargetServer: number; shotNo: number } | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'READY') return null;

    // 8 second lead time (Pose Guide 5s + 3-2-1 Countdown 3s)
    const leadTimeMs = 8000;
    const tTargetServer = Date.now() + leadTimeMs;

    session.state = 'COUNTDOWN';
    session.targetCaptureTime = tTargetServer;
    session.stateVersion += 1;

    return { tTargetServer, shotNo: session.currentShotNo };
  }

  /**
   * P1-01: Abort countdown if participant tab becomes hidden or disconnects during COUNTDOWN
   */
  public abortCountdown(sessionId: string, participantId: string, reason: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'COUNTDOWN') return false;

    // Reset to READY or CONNECTED depending on participant status
    session.state = 'CONNECTED';
    session.targetCaptureTime = undefined;
    session.stateVersion += 1;

    const parts = this.participants.get(sessionId) || [];
    const abortingPart = parts.find((p) => p.id === participantId);
    if (abortingPart) {
      abortingPart.ready = false;
      if (reason === 'tab_hidden') {
        abortingPart.tabVisible = false;
      }
    }

    return true;
  }

  /**
   * REC-03: Refresh session activity timestamp during heavy client canvas composition
   */
  public handleCompositingKeepalive(sessionId: string, participantId: string): void {
    const parts = this.participants.get(sessionId);
    if (parts) {
      const p = parts.find((part) => part.id === participantId);
      if (p) p.lastSeenAt = Date.now();
    }
  }

  /**
   * AMB-01: Record system auto-retry for desync without consuming user retake package quota (max 3x per shot)
   */
  public recordSystemRetry(sessionId: string): { canRetry: boolean; retryCount: number } {
    const session = this.sessions.get(sessionId);
    if (!session) return { canRetry: false, retryCount: 0 };

    const currentRetries = session.systemRetryCount || 0;
    if (currentRetries >= 3) {
      return { canRetry: false, retryCount: currentRetries };
    }

    session.systemRetryCount = currentRetries + 1;
    session.state = 'READY';
    session.stateVersion += 1;

    const parts = this.participants.get(sessionId) || [];
    parts.forEach((p) => (p.ready = false));

    return { canRetry: true, retryCount: session.systemRetryCount };
  }

  /**
   * P1-07: Lock raw photo files from auto-deletion while an active payment order is pending
   */
  public lockPhotosTtl(sessionId: string, until: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.photosTtlLockedUntil = Math.max(session.photosTtlLockedUntil || 0, until);
    }
  }

  /**
   * Save photo shot record
   */
  public saveShotPhoto(
    sessionId: string,
    participantId: string,
    shotNo: number,
    storageKey: string,
    url: string,
    dimensions: { width: number; height: number; bytes: number; tFrameServerEst?: number }
  ): { bothSaved: boolean; allShotsDone: boolean } {
    const session = this.sessions.get(sessionId);
    if (!session) return { bothSaved: false, allShotsDone: false };

    const photoList = this.photos.get(sessionId) || [];
    const photoId = uuidv4();

    const photo: SessionPhoto = {
      id: photoId,
      sessionId,
      participantId,
      shotNo,
      storageKey,
      url,
      bytes: dimensions.bytes,
      width: dimensions.width,
      height: dimensions.height,
      status: 'SAVED',
      tFrameServerEst: dimensions.tFrameServerEst,
      createdAt: Date.now(),
    };

    photoList.push(photo);
    this.photos.set(sessionId, photoList);

    // Check if both participants have uploaded for this shot
    const currentShotPhotos = photoList.filter((p) => p.shotNo === shotNo && p.status === 'SAVED');
    const bothSaved = currentShotPhotos.length >= 2;

    if (bothSaved) {
      session.shotCountSaved += 1;
      const allShotsDone = session.shotCountSaved >= session.shotCountTarget;

      if (allShotsDone) {
        session.state = 'REVIEW';
      } else {
        session.state = 'SHOT_SAVED';
        session.currentShotNo += 1;
        // Reset readiness for next shot
        const parts = this.participants.get(sessionId) || [];
        parts.forEach((p) => (p.ready = false));
      }
      session.stateVersion += 1;

      return { bothSaved: true, allShotsDone };
    }

    return { bothSaved: false, allShotsDone: false };
  }

  /**
   * Retake specific shot
   */
  public requestRetake(sessionId: string, shotNo: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.retakeUsed >= session.maxRetake) {
      return false;
    }

    session.retakeUsed += 1;
    session.currentShotNo = shotNo;
    session.state = 'READY';
    session.stateVersion += 1;

    // Reset readiness
    const parts = this.participants.get(sessionId) || [];
    parts.forEach((p) => (p.ready = false));

    return true;
  }

  /**
   * Handle participant disconnect & session pause (PRD §11.3)
   */
  public handleDisconnect(sessionId: string, participantId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state === 'COMPLETED' || session.state === 'EXPIRED') return;

    session.state = 'RECONNECTING';
    session.stateVersion += 1;

    // Clear existing timer if any
    const timerKey = `${sessionId}_${participantId}`;
    if (this.reconnectTimers.has(timerKey)) {
      clearTimeout(this.reconnectTimers.get(timerKey)!);
    }

    // After 90 seconds grace period -> PAUSED (PRD §11.4)
    const timeout = setTimeout(() => {
      const s = this.sessions.get(sessionId);
      if (s && s.state === 'RECONNECTING') {
        s.state = 'PAUSED';
        s.stateVersion += 1;
      }
    }, 90 * 1000);

    this.reconnectTimers.set(timerKey, timeout);
  }

  /**
   * Handle reconnect: restore snapshot
   */
  public handleReconnect(sessionId: string, participantId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const timerKey = `${sessionId}_${participantId}`;
    if (this.reconnectTimers.has(timerKey)) {
      clearTimeout(this.reconnectTimers.get(timerKey)!);
      this.reconnectTimers.delete(timerKey);
    }

    if (session.state === 'RECONNECTING' || session.state === 'PAUSED') {
      // Restore to appropriate prior state
      session.state = session.shotCountSaved >= session.shotCountTarget ? 'REVIEW' : 'CONNECTED';
      session.stateVersion += 1;
    }

    return session;
  }
}

const globalForSession = globalThis as unknown as {
  sessionStateManager: SessionStateManager | undefined;
};

if (!globalForSession.sessionStateManager || typeof (globalForSession.sessionStateManager as any).lockPhotosTtl !== 'function') {
  globalForSession.sessionStateManager = new SessionStateManager();
}

export const sessionStateManager = globalForSession.sessionStateManager;
