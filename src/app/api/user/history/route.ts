import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ReadingHistory from '@/lib/models/ReadingHistory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const history = await ReadingHistory.find({ userId })
      .populate('mangaId')
      .sort({ lastReadAt: -1 })
      .limit(20);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching reading history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, mangaId, chapterId, page } = await request.json();

    if (!userId || !mangaId || !chapterId) {
      return NextResponse.json({ error: 'User ID, Manga ID, and Chapter ID are required' }, { status: 400 });
    }

    await dbConnect();

    const historyEntry = await ReadingHistory.findOneAndUpdate(
      { userId, mangaId, chapterId },
      {
        page: page || 0,
        lastReadAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Reading progress updated', history: historyEntry });
  } catch (error) {
    console.error('Error updating reading history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
