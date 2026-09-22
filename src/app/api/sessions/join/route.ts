import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomCode, displayName } = body;

    if (!roomCode) {
      return NextResponse.json({ error: 'Kode room diperlukan' }, { status: 400 });
    }

    const session = sessionStateManager.getSessionByRoomCode(roomCode);
    if (!session) {
      return NextResponse.json({ error: 'Room tidak ditemukan atau sudah kedaluwarsa' }, { status: 404 });
    }

    const { participant } = sessionStateManager.joinSession(session.id, displayName || 'Partner');
    const participants = sessionStateManager.getParticipants(session.id);

    return NextResponse.json({
      session,
      participant,
      participantToken: participant.id,
      participants,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal bergabung' }, { status: 400 });
  }
}
