import { NextRequest, NextResponse } from 'next/server';
import { scrapeSource } from '@/lib/sources';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const source = searchParams.get('source') || 'comick'; // Default to Comick for reliable results

    console.log(`Fetching popular manga from source: ${source}`);

    // Fetch from the specified source (defaults to Comick for reliable results)
    const mangaList = await scrapeSource(source);

    if (!mangaList || mangaList.length === 0) {
      // If source fails, try MangaDex as fallback
      console.log('Primary source failed, trying MangaDex fallback');
      const fallbackList = await scrapeSource('mangadex');
      
      return NextResponse.json({
        data: fallbackList.slice(0, limit).map((manga) => ({
          id: manga.id,
          attributes: {
            title: {
              en: manga.title,
            },
            description: {
              en: manga.description || '',
            },
            status: manga.status || 'unknown',
            year: undefined,
            tags: manga.genres || [],
            coverUrl: manga.coverUrl || '',
            url: manga.url || '',
          },
        })),
      });
    }

    return NextResponse.json({
      data: mangaList.slice(0, limit).map((manga) => ({
        id: manga.id,
        attributes: {
          title: {
            en: manga.title,
          },
          description: {
            en: manga.description || '',
          },
          status: manga.status || 'unknown',
          year: undefined,
          tags: manga.genres || [],
          coverUrl: manga.coverUrl || '',
          url: manga.url || '',
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

