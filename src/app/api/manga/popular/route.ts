import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manga from '@/lib/models/Manga';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category') || 'all';

    // Get popular manga from database, sorted by something (could be by creation date or popularity)
    const manga = await Manga.find({})
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));

    return NextResponse.json({
      data: manga.map((m) => ({
        id: m.mangaId,
        attributes: {
          title: {
            en: m.title,
          },
          description: {
            en: m.description || '',
          },
          status: m.status,
          year: m.year,
          tags: m.tags,
          coverUrl: m.coverUrl,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching popular manga:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular manga' },
      { status: 500 }
    );
  }
}
