import { RateLimiter } from '../src/server/rate-limiter';
import { analyticsStore } from '../src/server/analytics-store';
import { sessionStateManager } from '../src/server/state-machine';
import { runCleanupCycle } from '../src/server/cleanup-job';

async function runServiceTests() {
  console.log('--- Testing Rate Limiter, Analytics & Cleanup Job ---');

  // 1. Test Rate Limiter
  console.log('\n[1] Testing RateLimiter sliding window...');
  const testLimiter = new RateLimiter(3, 1000); // max 3 per second
  const ip = '192.168.1.1';

  const r1 = testLimiter.check(ip);
  const r2 = testLimiter.check(ip);
  const r3 = testLimiter.check(ip);
  const r4 = testLimiter.check(ip);

  if (r1.allowed && r2.allowed && r3.allowed && !r4.allowed) {
    console.log('RateLimiter 3-request threshold: PASS');
  } else {
    throw new Error('RateLimiter failed to throttle on 4th request');
  }

  // 2. Test Analytics Store & Funnel Aggregation
  console.log('\n[2] Testing Analytics Store & Funnel Metrics...');
  analyticsStore.recordEvent('landing_view');
  analyticsStore.recordEvent('create_room');
  analyticsStore.recordEvent('partner_join');
  analyticsStore.recordEvent('device_check_pass');
  analyticsStore.recordEvent('ready_both');
  analyticsStore.recordEvent('shot_captured', undefined, undefined, { deltaMs: 25 });
  analyticsStore.recordEvent('shot_captured', undefined, undefined, { deltaMs: 35 });
  analyticsStore.recordEvent('shot_desync', undefined, undefined, { deltaMs: 120 });
  analyticsStore.recordEvent('paywall_view');
  analyticsStore.recordEvent('pay_paid');
  analyticsStore.recordEvent('download_hd');

  const funnel = analyticsStore.getFunnelStats();
  console.log('Funnel Result:', funnel);

  if (
    funnel.landingView >= 1 &&
    funnel.createRoom >= 1 &&
    funnel.partnerJoin >= 1 &&
    funnel.shotCaptured >= 2 &&
    funnel.shotDesync >= 1 &&
    funnel.payPaid >= 1 &&
    funnel.downloadHd >= 1 &&
    funnel.avgDesyncMs > 0
  ) {
    console.log('Analytics Store & Funnel: PASS');
  } else {
    throw new Error('Analytics funnel values mismatch');
  }

  // 3. Test Session Expiration & Cleanup
  console.log('\n[3] Testing Session Expiration & TTL Cleanup...');
  const { session } = sessionStateManager.createSession();
  // Manually backdate expiresAt and ttlAt to simulate expired session
  session.expiresAt = Date.now() - 5000;
  session.ttlAt = Date.now() - 5000;

  const expiredList = sessionStateManager.getExpiredSessions(Date.now());
  const found = expiredList.find((s) => s.id === session.id);
  if (!found) {
    throw new Error('Failed to identify expired session');
  }

  const cleanupResult = runCleanupCycle();
  if (session.state === 'EXPIRED') {
    console.log(`Session marked EXPIRED successfully. Purged dirs: ${cleanupResult.purgedStorageDirsCount}`);
    console.log('Session TTL & Cleanup: PASS');
  } else {
    throw new Error('Session was not expired by cleanup cycle');
  }

  // 4. Test Couple Timeline & Moment Calendar Quota
  console.log('\n[4] Testing Couple Timeline & Moment Calendar Quota...');
  const { timelineStore } = await import('../src/server/timeline-store');
  const claimed = timelineStore.claimOrUpdateTimeline({
    email: 'test.couple@example.com',
    partnerName1: 'Alice',
    partnerName2: 'Bob',
    anniversaryDate: '2022-01-01',
    resultToken: 'test-token-xyz',
    packageTier: '3_sessions',
    note: 'Our romantic test photostrip',
  });

  if (claimed.email === 'test.couple@example.com' && claimed.quotaRemaining === 2) {
    console.log('Couple Timeline claimed with 2 remaining quotas: PASS');
  } else {
    throw new Error('Timeline claim or quota calculation error');
  }

  const quotaUsed = timelineStore.deductQuota(claimed.id);
  if (quotaUsed && claimed.quotaRemaining === 1) {
    console.log('Deducting 1 session quota: PASS');
  } else {
    throw new Error('Failed to deduct session quota');
  }

  // 5. Test P1-07: Photo TTL Lock during active payment order
  console.log('\n[5] Testing Photo TTL Lock during active payment orders (P1-07)...');
  const { session: lockedSession } = sessionStateManager.createSession();
  lockedSession.expiresAt = Date.now() - 5000;
  lockedSession.ttlAt = Date.now() - 5000;
  // Lock photos TTL for 48 hours
  sessionStateManager.lockPhotosTtl(lockedSession.id, Date.now() + 48 * 60 * 60 * 1000);

  const expiredBeforePurge = sessionStateManager.getExpiredSessions(Date.now());
  const foundLocked = expiredBeforePurge.find((s) => s.id === lockedSession.id);
  if (!foundLocked) throw new Error('Locked session should still be in expired list for check');

  runCleanupCycle();
  // Session must NOT be expired or purged because photosTtlLockedUntil is in the future
  if (lockedSession.state === 'EXPIRED') {
    throw new Error('Session with locked photo TTL must not be prematurely expired/purged!');
  }
  console.log('Photo TTL Lock Protection: PASS');

  // 6. Test AMB-05: Webhook Signature Verification (Midtrans SHA-512 & Xendit HMAC-SHA256)
  console.log('\n[6] Testing Webhook Signature Verification (AMB-05)...');
  const { paymentService } = await import('../src/lib/payment/payment-service');
  const crypto = await import('crypto');

  // Midtrans SHA-512
  const midtransServerKey = 'test_secret_key_123';
  const midtransInput = 'SF-10020015000' + midtransServerKey;
  const expectedSha512 = crypto.createHash('sha512').update(midtransInput).digest('hex');
  const isMidtransValid = paymentService.verifyWebhookSignature(
    { orderId: 'SF-100', statusCode: '200', grossAmount: '15000' },
    expectedSha512,
    'midtrans',
    midtransServerKey
  );
  if (!isMidtransValid) throw new Error('Midtrans SHA-512 signature verification failed');

  // Xendit HMAC-SHA256
  const xenditToken = 'xendit_webhook_token_xyz';
  const xenditBody = JSON.stringify({ id: 'ord_123', status: 'PAID' });
  const expectedHmac = crypto.createHmac('sha256', xenditToken).update(xenditBody).digest('hex');
  const isXenditValid = paymentService.verifyWebhookSignature(
    { rawBody: xenditBody },
    expectedHmac,
    'xendit',
    xenditToken
  );
  if (!isXenditValid) throw new Error('Xendit HMAC-SHA256 signature verification failed');
  console.log('Webhook Signature Dual Verification: PASS');

  console.log('\nALL SERVICE TESTS PASSED!');
}

runServiceTests().catch((err) => {
  console.error('Service test failure:', err);
  process.exit(1);
});
