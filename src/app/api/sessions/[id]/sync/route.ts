import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get('participantId');

    const session = await sessionStateManager.getSessionAsync(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    if (participantId) {
      sessionStateManager.heartbeatParticipant(sessionId, participantId);
    }

    const participants = await sessionStateManager.getParticipantsAsync(sessionId);
    const signals = participantId
      ? await sessionStateManager.getAndClearSignalsAsync(sessionId, participantId)
      : [];
    const scheduledCapture = await sessionStateManager.getCaptureScheduleAsync(sessionId);

    return NextResponse.json({
      session,
      participants,
      signals,
      scheduledCapture,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal sinkronisasi' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await req.json();
    const { participantId, action, signal, targetParticipantId, shotNo, delayMs, templateId } = body;

    const session = await sessionStateManager.getSessionAsync(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    if (participantId) {
      sessionStateManager.heartbeatParticipant(sessionId, participantId);
    }

    switch (action) {
      case 'SIGNAL':
        if (signal && participantId) {
          await sessionStateManager.addSignalAsync(sessionId, participantId, signal, targetParticipantId);
        }
        break;

      case 'SCHEDULE_CAPTURE':
        const target = await sessionStateManager.scheduleCaptureAsync(sessionId, shotNo || 1, delayMs || 3000);
        return NextResponse.json({ success: true, tTargetServer: target?.tTargetServer });

      case 'ABORT_CAPTURE':
        await sessionStateManager.abortCaptureAsync(sessionId);
        break;

      case 'SELECT_TEMPLATE':
        if (templateId) {
          sessionStateManager.updateTemplate(sessionId, templateId);
        }
        break;

      default:
        break;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses aksi' }, { status: 500 });
  }
}
