export interface TimelineMoment {
  id: string;
  sessionId: string;
  resultToken: string;
  momentTitle: string;
  templateId: string;
  capturedAt: number;
  photostripUrl: string;
  note?: string;
}

export interface CoupleTimeline {
  id: string;
  email: string;
  partnerName1: string;
  partnerName2: string;
  anniversaryDate: string; // ISO date format YYYY-MM-DD
  packageTier: '1_session' | '3_sessions';
  quotaRemaining: number;
  quotaExpiresAt: number; // 90 days validity for 3-session tier
  createdAt: number;
  moments: TimelineMoment[];
}

export interface ClaimTimelineRequest {
  email: string;
  partnerName1: string;
  partnerName2: string;
  anniversaryDate: string;
  resultToken: string;
  packageTier?: '1_session' | '3_sessions';
  note?: string;
}
