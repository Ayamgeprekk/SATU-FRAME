/**
 * End-to-End Simulation Test: SATU FRAME v2.1
 * Tests the complete lifecycle against the running server:
 * 1. Create Room (POST /api/sessions)
 * 2. Join Partner (POST /api/sessions/join)
 * 3. Commit 4 Shots for both participants (POST /api/sessions/:id/shots/:n/commit)
 * 4. Render Photostrip via Sharp (POST /api/sessions/:id/render)
 * 5. Query Result Token (GET /api/results/:token)
 * 6. Create Package Order (POST /api/orders)
 * 7. Simulate Payment Webhook (POST /api/webhooks/payment)
 * 8. Verify Paid Order Status (GET /api/orders/:id/status)
 * 9. Claim Photostrip to Couple Timeline (POST /api/timeline)
 * 10. Query Timeline & Quotas (GET /api/timeline?email=...)
 */

const BASE_URL = 'http://localhost:3000';

// Minimal 1x1 valid JPEG byte sequence for test uploads
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const mockImageBuffer = Buffer.from(TINY_JPEG_BASE64, 'base64');

async function main() {
  console.log('--- Starting SATU FRAME End-to-End Simulation ---');

  // Step 1: Create Session
  console.log('\n[1] Creating Photobooth Session with template: the_daily_chronicle...');
  const createRes = await fetch(`${BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: 'the_daily_chronicle',
      momentId: 'anniversary',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create session: ${createRes.status} ${await createRes.text()}`);
  }

  const createData = await createRes.json();
  const session = createData.session;
  const creatorParticipantId = session.creatorParticipantId;
  console.log(`Session Created: ID=${session.id}, RoomCode=${session.roomCode}, ResultToken=${session.resultToken.substring(0, 12)}...`);

  // Step 2: Partner Join
  console.log('\n[2] Partner joining room with RoomCode...');
  const joinRes = await fetch(`${BASE_URL}/api/sessions/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomCode: session.roomCode,
      displayName: 'Partner Arya',
    }),
  });

  if (!joinRes.ok) {
    throw new Error(`Failed to join session: ${joinRes.status} ${await joinRes.text()}`);
  }

  const joinData = await joinRes.json();
  const partnerParticipantId = joinData.participant.id;
  console.log(`Partner Joined: ParticipantID=${partnerParticipantId}`);

  // Step 3: Commit 4 Shots (Creator & Partner)
  console.log('\n[3] Committing 4 Photobooth Shots (incremental persistence)...');
  for (let shotNo = 1; shotNo <= 4; shotNo++) {
    // Creator upload
    const formDataCreator = new FormData();
    formDataCreator.append('file', new Blob([mockImageBuffer], { type: 'image/jpeg' }), `creator_shot_${shotNo}.jpg`);
    formDataCreator.append('participantId', creatorParticipantId);
    formDataCreator.append('tFrameServerEst', String(Date.now()));

    const commitCreatorRes = await fetch(`${BASE_URL}/api/sessions/${session.id}/shots/${shotNo}/commit`, {
      method: 'POST',
      body: formDataCreator,
    });

    if (!commitCreatorRes.ok) {
      throw new Error(`Failed creator commit shot ${shotNo}: ${await commitCreatorRes.text()}`);
    }

    // Partner upload
    const formDataPartner = new FormData();
    formDataPartner.append('file', new Blob([mockImageBuffer], { type: 'image/jpeg' }), `partner_shot_${shotNo}.jpg`);
    formDataPartner.append('participantId', partnerParticipantId);
    formDataPartner.append('tFrameServerEst', String(Date.now() + 15));

    const commitPartnerRes = await fetch(`${BASE_URL}/api/sessions/${session.id}/shots/${shotNo}/commit`, {
      method: 'POST',
      body: formDataPartner,
    });

    if (!commitPartnerRes.ok) {
      throw new Error(`Failed partner commit shot ${shotNo}: ${await commitPartnerRes.text()}`);
    }

    console.log(`Shot #${shotNo} saved & verified for both participants.`);
  }

  // Step 4: Render Photostrip via Server Sharp Fallback
  console.log('\n[4] Requesting Server-Side Photostrip Render (Sharp fallback)...');
  const renderRes = await fetch(`${BASE_URL}/api/sessions/${session.id}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'strip',
      watermark: true,
    }),
  });

  if (!renderRes.ok) {
    throw new Error(`Failed to render photostrip: ${await renderRes.text()}`);
  }

  const renderData = await renderRes.json();
  console.log(`Photostrip Rendered Successfully: URL=${renderData.renderUrl}, Dimensions=${renderData.dimensions.width}x${renderData.dimensions.height}`);

  // Step 5: Fetch Result by Permanent Result Token
  console.log('\n[5] Fetching Result Details via Permanent Result Token...');
  const resultRes = await fetch(`${BASE_URL}/api/results/${session.resultToken}`);
  if (!resultRes.ok) {
    throw new Error(`Failed to fetch result: ${await resultRes.text()}`);
  }

  const resultData = await resultRes.json();
  console.log(`Result Loaded: State=${resultData.session.state}, Tier=${resultData.session.tier}, PhotosCount=${resultData.photos.length}`);

  // Step 6: Create Package Order (3 Sesi Rp35.000)
  console.log('\n[6] Creating Payment Order (Paket 3 Sesi: Rp35.000)...');
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resultToken: session.resultToken,
      packageId: 'pack_3_sessions',
      idempotencyKey: `idemp_${Date.now()}`,
    }),
  });

  if (!orderRes.ok) {
    throw new Error(`Failed to create order: ${await orderRes.text()}`);
  }

  const orderData = await orderRes.json();
  console.log(`Order Created: OrderID=${orderData.id}, Amount=Rp${orderData.amountIdr.toLocaleString('id-ID')}`);

  // Step 7: Simulate Midtrans Payment Settlement Webhook
  console.log('\n[7] Simulating Midtrans Settlement Webhook...');
  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderData.id,
      transaction_status: 'settlement',
      fraud_status: 'accept',
      gross_amount: String(orderData.amountIdr),
    }),
  });

  if (!webhookRes.ok) {
    throw new Error(`Payment webhook failed: ${await webhookRes.text()}`);
  }

  const webhookData = await webhookRes.json();
  console.log(`Webhook Processed: Status=${webhookData.status}`);

  // Step 8: Verify Order Status
  console.log('\n[8] Verifying Order Status via Status Endpoint...');
  const statusRes = await fetch(`${BASE_URL}/api/orders/${orderData.id}/status?t=${session.resultToken}`);
  if (!statusRes.ok) {
    throw new Error(`Failed to check order status: ${await statusRes.text()}`);
  }

  const statusData = await statusRes.json();
  console.log(`Order Status Verified: Status=${statusData.status}, Amount=Rp${statusData.amountIdr.toLocaleString('id-ID')}`);

  // Step 9: Claim to Couple Memory Timeline
  console.log('\n[9] Claiming Photostrip into Couple Memory Timeline...');
  const claimRes = await fetch(`${BASE_URL}/api/timeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resultToken: session.resultToken,
      partnerName1: 'Zidane',
      partnerName2: 'Partner',
      email: 'm.zidanearyasutha@gmail.com',
      anniversaryDate: '2024-02-14',
      packageTier: '3_sessions',
      note: 'Dua tempat, satu frame.',
    }),
  });

  if (!claimRes.ok) {
    throw new Error(`Failed to claim timeline: ${await claimRes.text()}`);
  }

  const claimData = await claimRes.json();
  console.log(`Timeline Claimed: ID=${claimData.timeline.id}, RemainingQuota=${claimData.timeline.quotaRemaining}`);

  // Step 10: Query Couple Timeline
  console.log('\n[10] Querying Couple Timeline Moments...');
  const queryRes = await fetch(`${BASE_URL}/api/timeline?email=m.zidanearyasutha@gmail.com`);
  if (!queryRes.ok) {
    throw new Error(`Failed to query timeline: ${await queryRes.text()}`);
  }

  const queryData = await queryRes.json();
  console.log(`Timeline Query Successful: MomentsCount=${queryData.timeline.moments.length}, DaysTogether=${queryData.timeline.daysTogether}`);

  console.log('\n=============================================');
  console.log('ALL 10 END-TO-END PIPELINE STEPS PASSED 100%!');
  console.log('=============================================\n');
}

main().catch((err) => {
  console.error('\nSimulation Failed:', err);
  process.exit(1);
});
