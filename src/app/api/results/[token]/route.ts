import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';
import { renderPhotostripServer } from '@/server/server-renderer';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const format = (req.nextUrl.searchParams.get('format') as 'strip' | 'story' | 'feed') || 'strip';
    const session = sessionStateManager.getSessionByResultToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Hasil sesi tidak ditemukan' }, { status: 404 });
    }

    const storageDir = path.join(process.cwd(), 'temp_uploads', session.id);
    const fileName = `${format}_${session.tier}.jpg`;
    const filePath = path.join(storageDir, fileName);

    // If photostrip image does not exist yet on disk, render it via Sharp
    if (!fs.existsSync(filePath)) {
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      // Collect available photos
      const photoBuffers: { slotIndex: number; buffer: Buffer }[] = [];
      const sessionPhotos = sessionStateManager.getPhotos(session.id);

      for (const p of sessionPhotos) {
        const pPath = path.join(process.cwd(), 'temp_uploads', session.id, `${p.shotNo}_${p.participantId}.jpg`);
        if (fs.existsSync(pPath)) {
          const buf = fs.readFileSync(pPath);
          const isCreator = p.participantId === session.creatorParticipantId;
          const slotIdx = (p.shotNo - 1) * 2 + (isCreator ? 0 : 1);
          photoBuffers.push({ slotIndex: slotIdx, buffer: buf });
        }
      }

      const renderedBuffer = await renderPhotostripServer({
        sessionId: session.id,
        templateId: session.templateId,
        format,
        photos: photoBuffers,
        watermark: session.tier === 'free',
      });

      fs.writeFileSync(filePath, renderedBuffer);
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
