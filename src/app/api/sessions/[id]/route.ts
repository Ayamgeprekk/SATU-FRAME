import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';
import { getUploadsDir } from '@/server/storage-helper';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const session = await sessionStateManager.getSessionAsync(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const participants = await sessionStateManager.getParticipantsAsync(sessionId);
    const photos = await sessionStateManager.getPhotosAsync(sessionId);

    return NextResponse.json({
      session,
      participants,
      photos,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const session = await sessionStateManager.getSessionAsync(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    // Purge temporary files from disk
    const storageDir = getUploadsDir(sessionId);
    if (fs.existsSync(storageDir)) {
      fs.rmSync(storageDir, { recursive: true, force: true });
    }

    // Transition session state to CANCELLED / EXPIRED
    session.state = 'CANCELLED';
    session.stateVersion += 1;

    return NextResponse.json({
      success: true,
      message: 'Seluruh data foto dan riwayat sesi berhasil dihapus permanen.',
    });
  } catch (err: any) {
    console.error('Error deleting session:', err);
    return NextResponse.json({ error: 'Gagal menghapus data sesi' }, { status: 500 });
  }
}
