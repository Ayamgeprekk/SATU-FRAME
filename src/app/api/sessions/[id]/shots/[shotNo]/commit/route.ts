import { NextRequest, NextResponse } from 'next/server';
import { sessionStateManager } from '@/server/state-machine';
import { photoUploadLimiter } from '@/server/rate-limiter';
import { getUploadsDir, ensureDirExists } from '@/server/storage-helper';
import fs from 'fs';
import path from 'path';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; shotNo: string } }
) {
  try {
    const sessionId = params.id;
    const shotNo = parseInt(params.shotNo, 10);

    const rateCheck = photoUploadLimiter.check(sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Batas unggah tercapai. Coba beberapa saat lagi.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rateCheck.resetInMs / 1000).toString() } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const participantId = formData.get('participantId') as string | null;
    const tFrameServerEst = formData.get('tFrameServerEst')
      ? parseFloat(formData.get('tFrameServerEst') as string)
      : undefined;

    if (!file || !participantId) {
      return NextResponse.json({ error: 'Missing file or participantId' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate size (max 5 MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Validate JPEG magic bytes: 0xFF, 0xD8, 0xFF
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return NextResponse.json({ error: 'Invalid JPEG file signature' }, { status: 400 });
    }

    // Save to temp storage directory (serverless safe)
    const storageDir = getUploadsDir(sessionId);
    ensureDirExists(storageDir);

    const fileName = `${shotNo}_${participantId}.jpg`;
    const filePath = path.join(storageDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const storageKey = `sessions/${sessionId}/shots/${fileName}`;
    const url = `/api/storage/${sessionId}/${fileName}`;

    const { bothSaved, allShotsDone, session } = await sessionStateManager.saveShotPhotoAsync(
      sessionId,
      participantId,
      shotNo,
      storageKey,
      url,
      {
        bytes: buffer.length,
        width: 1920,
        height: 1440,
        tFrameServerEst,
      }
    );

    return NextResponse.json({
      success: true,
      bothSaved,
      allShotsDone,
      session: session || (await sessionStateManager.getSessionAsync(sessionId)),
    });
  } catch (err: any) {
    console.error('Error committing photo shot:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
