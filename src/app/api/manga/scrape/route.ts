import { NextRequest, NextResponse } from 'next/server';
import { scrapeSource } from '@/lib/sources';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source parameter is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching manga from source: ${sourceId}`);
    
    // scrapeSource now includes MangaDex fallback for all sources
    const mangaList = await scrapeSource(sourceId);

    if (!mangaList || mangaList.length === 0) {
      return NextResponse.json(
        { error: 'No manga found' },
        { status: 404 }
      );
    }

    // Limit the results
    const limitedResults = mangaList.slice(0, limit);

    return NextResponse.json({
      data: limitedResults.map((manga) => ({
        id: manga.id,
        attributes: {
          title: {
            en: manga.title,
          },
          description: {
            en: manga.description || '',
          },
          status: manga.status || 'unknown',
          coverUrl: manga.coverUrl || '',
          tags: manga.genres || [],
          url: manga.url || '',
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching manga:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manga' },
      { status: 500 }
    );
  }
}
