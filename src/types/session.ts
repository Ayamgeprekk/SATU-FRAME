export type SessionState =
  | 'CREATED'
  | 'WAITING'
  | 'CONNECTED'
  | 'READY'
  | 'COUNTDOWN'
  | 'CAPTURING'
  | 'SHOT_SAVED'
  | 'RECONNECTING'
  | 'PAUSED'
  | 'REVIEW'
  | 'COMPOSING'
  | 'COMPOSE_FALLBACK'
  | 'RESULT_READY'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ABANDONED';

export type ParticipantRole = 'creator' | 'partner';

export interface Participant {
  id: string;
  sessionId: string;
  role: ParticipantRole;
  displayName: string;
  ready: boolean;
  consentAt?: number;
  deviceClass?: 'ios' | 'android-flagship' | 'android-mid' | 'android-entry' | 'desktop';
  deviceLagMs: number;
  offsetMs: number;
  tabVisible: boolean;
  wsRttMs: number;
  lastSeenAt: number;
}

export type PhotoStatus = 'LOCAL' | 'UPLOADING' | 'SAVED' | 'FAILED' | 'DESYNC';

export interface SessionPhoto {
  id: string;
  sessionId: string;
  participantId: string;
  shotNo: number; // 1..4
  storageKey: string;
  url: string;
  sha256?: string;
  bytes: number;
  width: number;
  height: number;
  status: PhotoStatus;
  tFrameServerEst?: number;
  createdAt: number;
}

export interface Session {
  id: string;
  roomCode: string;
  creatorParticipantId: string;
  templateId: string;
  templateVersion: number;
  state: SessionState;
  stateVersion: number;
  currentShotNo: number; // 1..4
  shotCountTarget: number; // default 4
  shotCountSaved: number;
  retakeUsed: number;
  maxRetake: number; // default 1 for free, 3 for HD
  systemRetryCount?: number; // AMB-01: auto-retake desync quota (max 3x per shot)
  photosTtlLockedUntil?: number; // P1-07: locks raw photos TTL during active payment orders
  tier: 'free' | 'paid_hd';
  resultToken: string;
  createdAt: number;
  connectedAt?: number;
  completedAt?: number;
  expiresAt: number;
  ttlAt: number;
  targetCaptureTime?: number;
  poseId?: string;
  activeOrderId?: string;
}

export interface TemplateSlot {
  index: number;
  participantRole: ParticipantRole;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export type TemplateCategory =
  | 'romantic'
  | 'graduation'
  | 'reunion'
  | 'birthday'
  | 'concert'
  | 'vintage'
  | 'classic'
  | 'minimal'
  | 'creative'
  | 'newspaper'
  | 'magazine'
  | 'wedding'
  | 'travel'
  | 'comic'
  | 'fandom';

export type TemplateStyleTheme =
  | 'newspaper'
  | 'magazine'
  | 'film_35mm'
  | 'wedding_botanical'
  | 'postcard_airmail'
  | 'comic_screentone'
  | 'kpop_photocard'
  | 'retro_arcade'
  | 'minimal_clean';

export interface FrameTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  styleTheme?: TemplateStyleTheme;
  version: number;
  aspectRatio: string; // e.g. "1:3" or "9:16"
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
  headerText?: string;
  footerText?: string;
  eventTag: string; // e.g. "Anniversary & Pasangan", "Kelulusan & Wisuda"
  badge?: string; // e.g. "Eksklusif", "Populer"
  description?: string;
  textColor?: string; // High contrast WCAG AA title text color
  subtextColor?: string; // High contrast subtitle/footer text color
  isPremium: boolean;
  overlayPngUrl?: string; // Transparent PNG overlay (e.g. Canva transparent export)
  slots: TemplateSlot[];
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'gopay' | 'shopeepay' | 'qris' | 'va' | 'mock';

export interface Order {
  id: string;
  sessionId: string;
  packageId: '1_session' | '3_sessions';
  amountIdr: number;
  status: OrderStatus;
  method?: PaymentMethod;
  gateway: 'midtrans' | 'mock';
  gatewayRef?: string;
  idempotencyKey: string;
  qrCodeUrl?: string;
  qrString?: string;
  deeplinkUrl?: string;
  expiresAt: number;
  paidAt?: number;
  fulfilledAt?: number;
  createdAt: number;
}

// WebSocket Event Payloads
export type WsEventType =
  | 'PRESENCE'
  | 'TIME_PING'
  | 'TIME_PONG'
  | 'READY'
  | 'SCHEDULE_CAPTURE'
  | 'ACK_CAPTURE'
  | 'CAPTURE_ABORT'
  | 'COMPOSITING_KEEPALIVE'
  | 'SHOT_SAVED'
  | 'SHOT_DESYNC'
  | 'STATE_SNAPSHOT'
  | 'RETAKE_REQUEST'
  | 'PAYMENT_PAID'
  | 'WEBRTC_SIGNAL'
  | 'ERROR';

export interface WsEvent<T = any> {
  type: WsEventType;
  eventId: string;
  stateVersion?: number;
  payload: T;
  timestamp: number;
}
