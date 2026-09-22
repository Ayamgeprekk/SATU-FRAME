import { Session, SessionState, Participant, SessionPhoto } from '@/types/session';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface WebRtcSignalEnvelope {
  id: string;
  fromParticipantId: string;
  targetParticipantId?: string;
  signal: any;
  createdAt: number;
}

const KV_BUCKET = process.env.KV_BUCKET || 'VPL2UdYHEhvzmrYhnaYASg';
const KV_BASE_URL = `https://kvdb.io/${KV_BUCKET}`;

async function cloudSet(key: string, value: any): Promise<void> {
  try {
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    await fetch(`${KV_BASE_URL}/${key}`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {}
}

async function cloudGet<T = any>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`${KV_BASE_URL}/${key}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.includes('Not Found') || text.includes('invalid JSON')) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch {
    return null;
  }
}

export class SessionStateManager {
  private sessions = new Map<string, Session>();
  private participants = new Map<string, Participant[]>();
  private photos = new Map<string, SessionPhoto[]>();
  private eventLogs = new Map<string, any[]>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private signals = new Map<string, WebRtcSignalEnvelope[]>();
  private captureSchedules = new Map<string, { tTargetServer: number; shotNo: number } | null>();

  constructor() {
    this.loadState();
  }

  private getStorageFilePath(): string {
    const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    const dir = isVercel ? '/tmp' : path.join(process.cwd(), 'temp_uploads');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'sf_sessions_state.json');
  }

  private saveState(): void {
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        participants: Array.from(this.participants.entries()),
        photos: Array.from(this.photos.entries()),
        signals: Array.from(this.signals.entries()),
        captureSchedules: Array.from(this.captureSchedules.entries()),
      };
      fs.writeFileSync(this.getStorageFilePath(), JSON.stringify(data), 'utf-8');
    } catch {}
  }

  private loadState(): void {
    try {
      const filePath = this.getStorageFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.sessions) this.sessions = new Map(data.sessions);
        if (data.participants) this.participants = new Map(data.participants);
        if (data.photos) this.photos = new Map(data.photos);
        if (data.signals) this.signals = new Map(data.signals);
        if (data.captureSchedules) this.captureSchedules = new Map(data.captureSchedules);
      }
    } catch {}
  }

  public addSignal(sessionId: string, fromParticipantId: string, signal: any, targetParticipantId?: string): void {
    this.loadState();
    const list = this.signals.get(sessionId) || [];
    list.push({
      id: uuidv4(),
      fromParticipantId,
      targetParticipantId,
      signal,
      createdAt: Date.now(),
    });
    this.signals.set(sessionId, list);
    this.saveState();
  }

  public getAndClearSignals(sessionId: string, forParticipantId: string): any[] {
    this.loadState();
    const list = this.signals.get(sessionId) || [];
    const forMe = list.filter(
      (s) =>
        s.fromParticipantId !== forParticipantId &&
        (!s.targetParticipantId || s.targetParticipantId === forParticipantId)
    );
    const remaining = list.filter(
      (s) =>
        s.fromParticipantId === forParticipantId ||
        (s.targetParticipantId && s.targetParticipantId !== forParticipantId && Date.now() - s.createdAt < 60000)
    );
    this.signals.set(sessionId, remaining);
    this.saveState();
    return forMe.map((s) => s.signal);
  }

  public abortCapture(sessionId: string): void {
    this.loadState();
    this.captureSchedules.set(sessionId, null);
    this.saveState();
  }

  public getCaptureSchedule(sessionId: string): { tTargetServer: number; shotNo: number } | null {
    this.loadState();
    const sched = this.captureSchedules.get(sessionId) || null;
    if (sched && Date.now() > sched.tTargetServer + 5000) {
      this.captureSchedules.set(sessionId, null);
      this.saveState();
      return null;
    }
    return sched;
  }

  public heartbeatParticipant(sessionId: string, participantId: string): void {
    this.loadState();
    const parts = this.participants.get(sessionId);
    if (parts) {
      const p = parts.find((item) => item.id === participantId);
      if (p) {
        p.lastSeenAt = Date.now();
        this.saveState();
      }
    }
  }

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
    this.saveState();

    return { session, creatorToken: creatorId };
  }

  public getSession(sessionId: string): Session | undefined {
    let s = this.sessions.get(sessionId);
    if (!s) {
      this.loadState();
      s = this.sessions.get(sessionId);
    }
    return s;
  }

  public getSessionByRoomCode(code: string): Session | undefined {
    this.loadState();
    const upper = code.toUpperCase().trim();
    for (const s of this.sessions.values()) {
      if (s.roomCode === upper && s.state !== 'EXPIRED' && s.state !== 'CANCELLED') {
        return s;
      }
    }
    return undefined;
  }

  public getSessionByResultToken(token: string): Session | undefined {
    this.loadState();
    for (const s of this.sessions.values()) {
      if (s.resultToken === token) return s;
    }
    return undefined;
  }

  public async getSessionByResultTokenAsync(token: string): Promise<Session | undefined> {
    const sessionId = await cloudGet<string>(`result_${token}`);
    if (sessionId) {
      return await this.getSessionAsync(sessionId);
    }
    return this.getSessionByResultToken(token);
  }

  public async createSessionAsync(templateId = 'classic_strip'): Promise<{ session: Session; creatorToken: string }> {
    const res = this.createSession(templateId);
    await Promise.all([
      cloudSet(`room_${res.session.roomCode.toUpperCase()}`, res.session.id),
      cloudSet(`result_${res.session.resultToken}`, res.session.id),
      cloudSet(`session_${res.session.id}`, res.session),
      cloudSet(`parts_${res.session.id}`, this.participants.get(res.session.id) || []),
    ]);
    return res;
  }

  public async getSessionAsync(sessionId: string): Promise<Session | undefined> {
    const cloudSess = await cloudGet<Session>(`session_${sessionId}`);
    if (cloudSess) {
      this.sessions.set(sessionId, cloudSess);
      return cloudSess;
    }
    return this.getSession(sessionId);
  }

  public async getSessionByRoomCodeAsync(code: string): Promise<Session | undefined> {
    const upper = code.toUpperCase().trim();
    const sessionId = await cloudGet<string>(`room_${upper}`);
    if (sessionId) {
      return await this.getSessionAsync(sessionId);
    }
    return this.getSessionByRoomCode(code);
  }

  public async getParticipantsAsync(sessionId: string): Promise<Participant[]> {
    const cloudParts = await cloudGet<Participant[]>(`parts_${sessionId}`);
    if (cloudParts && cloudParts.length > 0) {
      this.participants.set(sessionId, cloudParts);
      return cloudParts;
    }
    return this.getParticipants(sessionId);
  }

  public async joinSessionAsync(sessionId: string, displayName = 'Partner'): Promise<{ participant: Participant }> {
    let session = await this.getSessionAsync(sessionId);
    if (!session) throw new Error('Session not found');

    const parts = (await this.getParticipantsAsync(sessionId)) || [];
    const existingPartner = parts.find((p) => p.role === 'partner');

    if (existingPartner) {
      existingPartner.lastSeenAt = Date.now();
      await cloudSet(`parts_${sessionId}`, parts);
      this.saveState();
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

    if (session.state === 'WAITING') {
      session.state = 'CONNECTED';
      session.connectedAt = Date.now();
      session.stateVersion += 1;
    }

    this.saveState();

    await Promise.all([
      cloudSet(`parts_${sessionId}`, parts),
      cloudSet(`session_${sessionId}`, session),
    ]);

    return { participant: partner };
  }

  public async addSignalAsync(
    sessionId: string,
    fromParticipantId: string,
    signal: any,
    targetParticipantId?: string
  ): Promise<void> {
    this.addSignal(sessionId, fromParticipantId, signal, targetParticipantId);
    try {
      const cloudSignals = (await cloudGet<WebRtcSignalEnvelope[]>(`signals_${sessionId}`)) || [];
      cloudSignals.push({
        id: uuidv4(),
        fromParticipantId,
        targetParticipantId,
        signal,
        createdAt: Date.now(),
      });
      await cloudSet(`signals_${sessionId}`, cloudSignals);
    } catch {}
  }

  public async getAndClearSignalsAsync(sessionId: string, forParticipantId: string): Promise<any[]> {
    const localSignals = this.getAndClearSignals(sessionId, forParticipantId);
    try {
      const cloudSignals = (await cloudGet<WebRtcSignalEnvelope[]>(`signals_${sessionId}`)) || [];
      const forMe = cloudSignals.filter(
        (s) =>
          s.fromParticipantId !== forParticipantId &&
          (!s.targetParticipantId || s.targetParticipantId === forParticipantId)
      );
      const remaining = cloudSignals.filter(
        (s) =>
          s.fromParticipantId === forParticipantId ||
          (s.targetParticipantId && s.targetParticipantId !== forParticipantId && Date.now() - s.createdAt < 60000)
      );
      if (forMe.length > 0) {
        await cloudSet(`signals_${sessionId}`, remaining);
      }
      return [...localSignals, ...forMe.map((s) => s.signal)];
    } catch {
      return localSignals;
    }
  }

  public async scheduleCaptureAsync(
    sessionId: string,
    customShotNo?: number,
    delayMs = 3000
  ): Promise<{ tTargetServer: number; shotNo: number } | null> {
    const sched = this.scheduleCapture(sessionId, customShotNo, delayMs);
    if (sched) {
      await cloudSet(`sched_${sessionId}`, sched);
      const sess = this.sessions.get(sessionId);
      if (sess) await cloudSet(`session_${sessionId}`, sess);
    }
    return sched;
  }

  public async getCaptureScheduleAsync(
    sessionId: string
  ): Promise<{ tTargetServer: number; shotNo: number } | null> {
    const cloudSched = await cloudGet<{ tTargetServer: number; shotNo: number }>(`sched_${sessionId}`);
    if (cloudSched !== undefined && cloudSched !== null) {
      if (Date.now() > cloudSched.tTargetServer + 4000) {
        await cloudSet(`sched_${sessionId}`, null);
        this.captureSchedules.delete(sessionId);
        return null;
      }
      this.captureSchedules.set(sessionId, cloudSched);
      return cloudSched;
    }
    return this.getCaptureSchedule(sessionId);
  }

  public async abortCaptureAsync(sessionId: string): Promise<void> {
    this.abortCapture(sessionId);
    await cloudSet(`sched_${sessionId}`, null);
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
    let p = this.participants.get(sessionId);
    if (!p || p.length === 0) {
      this.loadState();
      p = this.participants.get(sessionId);
    }
    return p || [];
  }

  public getPhotos(sessionId: string): SessionPhoto[] {
    return this.photos.get(sessionId) || [];
  }

  public async getPhotosAsync(sessionId: string): Promise<SessionPhoto[]> {
    let p = this.photos.get(sessionId);
    if (p && p.length > 0) return p;

    const cloudPhotos = await cloudGet<SessionPhoto[]>(`photos_${sessionId}`);
    if (cloudPhotos && Array.isArray(cloudPhotos)) {
      this.photos.set(sessionId, cloudPhotos);
      return cloudPhotos;
    }
    return [];
  }

  public updateTemplate(sessionId: string, templateId: string): Session | undefined {
    let session = this.sessions.get(sessionId);
    if (!session) {
      this.loadState();
      session = this.sessions.get(sessionId);
    }
    if (!session) return undefined;
    session.templateId = templateId;
    session.stateVersion += 1;
    this.saveState();
    return session;
  }

  /**
   * Partner joins session
   */
  public joinSession(sessionId: string, displayName = 'Partner'): { participant: Participant } {
    let session = this.sessions.get(sessionId);
    if (!session) {
      this.loadState();
      session = this.sessions.get(sessionId);
    }
    if (!session) throw new Error('Session not found');

    const parts = this.participants.get(sessionId) || [];
    const existingPartner = parts.find((p) => p.role === 'partner');

    if (existingPartner) {
      existingPartner.lastSeenAt = Date.now();
      this.saveState();
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

    this.saveState();
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
  public scheduleCapture(
    sessionId: string,
    customShotNo?: number,
    delayMs = 3000
  ): { tTargetServer: number; shotNo: number } | null {
    this.loadState();
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const tTargetServer = Date.now() + delayMs;
    const shotNo = customShotNo || session.currentShotNo || 1;

    session.state = 'COUNTDOWN';
    session.targetCaptureTime = tTargetServer;
    session.stateVersion += 1;

    this.captureSchedules.set(sessionId, { tTargetServer, shotNo });
    this.saveState();

    return { tTargetServer, shotNo };
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

    const parts = this.participants.get(sessionId) || [];
    const currentShotPhotos = photoList.filter((p) => p.shotNo === shotNo && p.status === 'SAVED');
    const requiredPhotos = Math.max(1, Math.min(parts.length || 1, 2));
    const bothSaved = currentShotPhotos.length >= requiredPhotos;

    if (bothSaved) {
      const savedShots = new Set(photoList.filter((p) => p.status === 'SAVED').map((p) => p.shotNo));
      session.shotCountSaved = savedShots.size;
      const allShotsDone = session.shotCountSaved >= session.shotCountTarget;

      if (allShotsDone) {
        session.state = 'REVIEW';
      } else {
        session.state = 'SHOT_SAVED';
        session.currentShotNo = Math.min(session.shotCountTarget, shotNo + 1);
        parts.forEach((p) => (p.ready = false));
      }
      session.stateVersion += 1;
      this.captureSchedules.delete(sessionId);
      this.saveState();

      return { bothSaved: true, allShotsDone };
    }

    this.saveState();
    return { bothSaved: false, allShotsDone: false };
  }

  /**
   * Asynchronous photo shot save with distributed cloud KV persistence
   */
  public async saveShotPhotoAsync(
    sessionId: string,
    participantId: string,
    shotNo: number,
    storageKey: string,
    url: string,
    dimensions: { width: number; height: number; bytes: number; tFrameServerEst?: number }
  ): Promise<{ bothSaved: boolean; allShotsDone: boolean; session?: Session }> {
    let session = await this.getSessionAsync(sessionId);
    if (!session) return { bothSaved: false, allShotsDone: false };

    const parts = (await this.getParticipantsAsync(sessionId)) || [];
    let photoList = await this.getPhotosAsync(sessionId);

    const existingIndex = photoList.findIndex(
      (p) => p.shotNo === shotNo && p.participantId === participantId
    );
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

    if (existingIndex >= 0) {
      photoList[existingIndex] = photo;
    } else {
      photoList.push(photo);
    }
    this.photos.set(sessionId, photoList);

    const currentShotPhotos = photoList.filter((p) => p.shotNo === shotNo && p.status === 'SAVED');
    const requiredPhotos = Math.max(1, Math.min(parts.length || 1, 2));
    const bothSaved = currentShotPhotos.length >= requiredPhotos;

    if (bothSaved) {
      const savedShots = new Set(photoList.filter((p) => p.status === 'SAVED').map((p) => p.shotNo));
      session.shotCountSaved = savedShots.size;
      const allShotsDone = session.shotCountSaved >= session.shotCountTarget;

      if (allShotsDone) {
        session.state = 'REVIEW';
      } else {
        session.state = 'SHOT_SAVED';
        session.currentShotNo = Math.min(session.shotCountTarget, shotNo + 1);
        parts.forEach((p) => (p.ready = false));
      }
      session.stateVersion += 1;
      this.sessions.set(sessionId, session);
      this.captureSchedules.delete(sessionId);
      this.saveState();

      await Promise.all([
        cloudSet(`photos_${sessionId}`, photoList),
        cloudSet(`session_${sessionId}`, session),
        cloudSet(`parts_${sessionId}`, parts),
        cloudSet(`sched_${sessionId}`, null),
      ]);

      return { bothSaved: true, allShotsDone, session };
    }

    this.saveState();
    await Promise.all([
      cloudSet(`photos_${sessionId}`, photoList),
      cloudSet(`session_${sessionId}`, session),
    ]);

    return { bothSaved: false, allShotsDone: false, session };
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
