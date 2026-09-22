export type AnalyticsEventName =
  | 'landing_view'
  | 'create_room'
  | 'partner_join'
  | 'device_check_pass'
  | 'ready_both'
  | 'shot_captured'
  | 'shot_desync'
  | 'paywall_view'
  | 'pay_paid'
  | 'download_free'
  | 'download_hd';

export interface AnalyticsEvent {
  id: string;
  eventName: AnalyticsEventName;
  sessionId?: string;
  participantId?: string;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface FunnelStats {
  landingView: number;
  createRoom: number;
  partnerJoin: number;
  deviceCheckPass: number;
  readyBoth: number;
  shotCaptured: number;
  shotDesync: number;
  paywallView: number;
  payPaid: number;
  downloadFree: number;
  downloadHd: number;
  avgDesyncMs: number;
}
