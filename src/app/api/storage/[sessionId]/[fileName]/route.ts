import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string; fileName: string } }
) {
  try {
    const { sessionId, fileName } = params;
    // Sanitize fileName to prevent directory traversal
    const safeFileName = path.basename(fileName);
    const filePath = path.join(process.cwd(), 'temp_uploads', sessionId, safeFileName);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
