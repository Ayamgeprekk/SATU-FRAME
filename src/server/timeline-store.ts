import { CoupleTimeline, ClaimTimelineRequest, TimelineMoment } from '@/types/timeline';
import { sessionStateManager } from './state-machine';
import { v4 as uuidv4 } from 'uuid';

/**
 * Server Couple Memory Timeline & Moment Calendar Store (PRD §4 Pillar C & E, §5.1, §6.2)
 * Manages recurring couple photostrips, anniversary tracking, and 90-day 3-session quota.
 */
class TimelineStore {
  private timelines = new Map<string, CoupleTimeline>(); // id -> CoupleTimeline
  private emailIndex = new Map<string, string>(); // normalized email -> id

  constructor() {
    // Optional demo memory timeline for instant preview
    const demoId = 'demo-couple-timeline';
    const demoEmail = 'rara.dimas@example.com';
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    const demoTimeline: CoupleTimeline = {
      id: demoId,
      email: demoEmail,
      partnerName1: 'Rara',
      partnerName2: 'Dimas',
      anniversaryDate: '2023-08-15',
      packageTier: '3_sessions',
      quotaRemaining: 2,
      quotaExpiresAt: now + ninetyDays,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      moments: [
        {
          id: uuidv4(),
          sessionId: 'demo-session-1',
          resultToken: 'demo-token-1',
          momentTitle: 'Anniversary 1 Tahun',
          templateId: 'romantic_moment',
          capturedAt: now - 30 * 24 * 60 * 60 * 1000,
          photostripUrl: '/api/storage/demo/strip_paid_hd.jpg',
          note: 'Pertama kali coba photobooth bareng meski Jakarta - Malang.',
        },
      ],
    };

    this.timelines.set(demoId, demoTimeline);
    this.emailIndex.set(demoEmail, demoId);
  }

  public getTimelineById(id: string): CoupleTimeline | undefined {
    return this.timelines.get(id);
  }

  public getTimelineByEmail(email: string): CoupleTimeline | undefined {
    const cleanEmail = email.toLowerCase().trim();
    const id = this.emailIndex.get(cleanEmail);
    return id ? this.timelines.get(id) : undefined;
  }

  public async claimOrUpdateTimeline(req: ClaimTimelineRequest): Promise<CoupleTimeline> {
    const cleanEmail = req.email.toLowerCase().trim();
    const session =
      (await sessionStateManager.getSessionByResultTokenAsync(req.resultToken)) ||
      sessionStateManager.getSessionByResultToken(req.resultToken);

    let timeline = this.getTimelineByEmail(cleanEmail);
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    const packageTier = req.packageTier || (session?.tier === 'paid_hd' ? '1_session' : '1_session');
    const initialQuota = packageTier === '3_sessions' ? 2 : 0; // 1 used for current session, 2 left if 3-session pack

    const moment: TimelineMoment = {
      id: uuidv4(),
      sessionId: session?.id || req.resultToken,
      resultToken: req.resultToken,
      momentTitle: req.note || 'Sesi Photobooth Bareng',
      templateId: session?.templateId || 'classic_strip',
      capturedAt: session?.createdAt || now,
      photostripUrl: `/api/results/${req.resultToken}`,
      note: req.note,
    };

    if (!timeline) {
      const newId = uuidv4();
      timeline = {
        id: newId,
        email: cleanEmail,
        partnerName1: req.partnerName1?.trim() || 'Kamu',
        partnerName2: req.partnerName2?.trim() || 'Pasangan',
        anniversaryDate: req.anniversaryDate,
        packageTier,
        quotaRemaining: initialQuota,
        quotaExpiresAt: now + ninetyDays,
        createdAt: now,
        moments: [moment],
      };
      this.timelines.set(newId, timeline);
      this.emailIndex.set(cleanEmail, newId);
    } else {
      // Append moment if not already in timeline
      const exists = timeline.moments.some((m) => m.resultToken === req.resultToken);
      if (!exists) {
        timeline.moments.unshift(moment);
      }
      if (req.packageTier === '3_sessions') {
        timeline.packageTier = '3_sessions';
        timeline.quotaRemaining += 2;
        timeline.quotaExpiresAt = now + ninetyDays;
      }
      if (req.partnerName1) timeline.partnerName1 = req.partnerName1.trim();
      if (req.partnerName2) timeline.partnerName2 = req.partnerName2.trim();
      if (req.anniversaryDate) timeline.anniversaryDate = req.anniversaryDate;
    }

    return timeline;
  }

  public deductQuota(timelineId: string): boolean {
    const timeline = this.timelines.get(timelineId);
    if (!timeline) return false;
    if (timeline.quotaRemaining <= 0) return false;
    if (Date.now() > timeline.quotaExpiresAt) return false;

    timeline.quotaRemaining -= 1;
    return true;
  }
}

const globalForTimeline = globalThis as unknown as {
  timelineStore: TimelineStore | undefined;
};

export const timelineStore =
  globalForTimeline.timelineStore ?? new TimelineStore();

globalForTimeline.timelineStore = timelineStore;
