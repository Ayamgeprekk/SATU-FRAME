import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';
import { renderPhotostripServer } from '@/server/server-renderer';
import { ExportFormat, LAYOUT_PROFILES } from '@/lib/render/templates';
import path from 'path';
import fs from 'fs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await req.json().catch(() => ({}));
    const { format = 'strip', watermark } = body;

    const session = sessionStateManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const photos = sessionStateManager.getPhotos(sessionId);
    const storageDir = path.join(process.cwd(), 'temp_uploads', sessionId);

    // Group photos by shot number and collect buffers for 8 slots (creator + partner)
    const photoBuffers: { slotIndex: number; buffer: Buffer }[] = [];
    for (const photo of photos) {
      const fileName = `${photo.shotNo}_${photo.participantId}.jpg`;
      const filePath = path.join(storageDir, fileName);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const isCreator = photo.participantId === session.creatorParticipantId;
        const slotIndex = (photo.shotNo - 1) * 2 + (isCreator ? 0 : 1);
        photoBuffers.push({
          slotIndex,
          buffer,
        });
      }
    }

    // Determine watermark based on session tier or request
    const applyWatermark = watermark !== undefined ? Boolean(watermark) : session.tier === 'free';

    const renderedBuffer = await renderPhotostripServer({
      sessionId,
      templateId: session.templateId,
      format: format as ExportFormat,
      photos: photoBuffers,
      watermark: applyWatermark,
      dateStr: new Date(session.createdAt).toLocaleDateString('id-ID'),
    });

    const exportProfile = LAYOUT_PROFILES[format as ExportFormat] || LAYOUT_PROFILES.strip;

    // Save rendered buffer in storage directory for retrieval
    const renderFileName = `render_${format}_${Date.now()}.jpg`;
    const renderFilePath = path.join(storageDir, renderFileName);
    fs.writeFileSync(renderFilePath, renderedBuffer);

    const renderUrl = `/api/storage/${sessionId}/${renderFileName}`;

    return NextResponse.json({
      success: true,
      renderUrl,
      dimensions: {
        width: exportProfile.canvasWidth,
        height: exportProfile.canvasHeight,
      },
      tier: session.tier,
      watermark: applyWatermark,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal merender photostrip di server' },
      { status: 500 }
    );
  }
}
