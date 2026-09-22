import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';
import { renderPhotostripServer } from '@/server/server-renderer';
import { getUploadsDir, ensureDirExists, getStorageFilePath } from '@/server/storage-helper';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const format = (req.nextUrl.searchParams.get('format') as 'strip' | 'story' | 'feed') || 'strip';
    const session =
      (await sessionStateManager.getSessionByResultTokenAsync(token)) ||
      sessionStateManager.getSessionByResultToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Hasil sesi tidak ditemukan' }, { status: 404 });
    }

    const storageDir = getUploadsDir(session.id);
    const fileName = `${format}_${session.tier}.jpg`;
    const filePath = path.join(storageDir, fileName);

    // If photostrip image does not exist yet on disk, render it via Sharp
    if (!fs.existsSync(filePath)) {
      ensureDirExists(storageDir);

      // Collect available photos
      const photoBuffers: { slotIndex: number; buffer: Buffer }[] = [];
      const sessionPhotos = await sessionStateManager.getPhotosAsync(session.id);

      for (const p of sessionPhotos) {
        const pPath = getStorageFilePath(session.id, `${p.shotNo}_${p.participantId}.jpg`);
        if (fs.existsSync(pPath)) {
          const buf = fs.readFileSync(pPath);
          const isCreator = p.participantId === session.creatorParticipantId;
          const slotIdx = (p.shotNo - 1) * 2 + (isCreator ? 0 : 1);
          photoBuffers.push({ slotIndex: slotIdx, buffer: buf });
        }
      }

      try {
        const renderedBuffer = await renderPhotostripServer({
          sessionId: session.id,
          templateId: session.templateId,
          format,
          photos: photoBuffers,
          watermark: session.tier === 'free',
        });
        fs.writeFileSync(filePath, renderedBuffer);
      } catch (renderErr) {
        console.warn('Server renderPhotostrip warning:', renderErr);
      }
    }

    const photostripUrl = `/api/storage/${session.id}/${fileName}`;
    const sessionPhotos = sessionStateManager.getPhotos(session.id);

    return NextResponse.json({
      session,
      tier: session.tier,
      photostripUrl,
      photos: sessionPhotos,
    });
  } catch (err: any) {
    console.error('Error fetching result:', err);
    return NextResponse.json({ error: 'Gagal memuat hasil' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const session =
      (await sessionStateManager.getSessionByResultTokenAsync(token)) ||
      sessionStateManager.getSessionByResultToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Hasil sesi tidak ditemukan' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const format = (formData.get('format') as string) || 'strip';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storageDir = getUploadsDir(session.id);
    ensureDirExists(storageDir);

    const fileName = `${format}_${session.tier}.jpg`;
    const filePath = path.join(storageDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const photostripUrl = `/api/storage/${session.id}/${fileName}`;

    return NextResponse.json({
      success: true,
      photostripUrl,
    });
  } catch (err: any) {
    console.error('Error saving rendered result:', err);
    return NextResponse.json({ error: 'Gagal menyimpan hasil' }, { status: 500 });
  }
}
