import { NextRequest, NextResponse } from 'next/server';
import { timelineStore } from '@/server/timeline-store';
import { ClaimTimelineRequest } from '@/types/timeline';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    const id = req.nextUrl.searchParams.get('id');

    if (!email && !id) {
      return NextResponse.json({ error: 'Parameter email atau id wajib diisi' }, { status: 400 });
    }

    const timeline = id
      ? timelineStore.getTimelineById(id)
      : email
      ? timelineStore.getTimelineByEmail(email)
      : undefined;

    if (!timeline) {
      return NextResponse.json({ error: 'Linimasa memori tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ timeline });
  } catch (err: any) {
    return NextResponse.json({ error: 'Gagal memuat linimasa' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ClaimTimelineRequest = await req.json();

    if (!body.email || !body.resultToken) {
      return NextResponse.json(
        { error: 'Email dan token hasil foto wajib diisi' },
        { status: 400 }
      );
    }

    const timeline = await timelineStore.claimOrUpdateTimeline(body);

    return NextResponse.json({
      success: true,
      timeline,
      timelineUrl: `/timeline?id=${timeline.id}`,
    });
  } catch (err: any) {
    console.error('Error claiming timeline:', err);
    return NextResponse.json({ error: 'Gagal menyimpan ke linimasa' }, { status: 500 });
  }
}
