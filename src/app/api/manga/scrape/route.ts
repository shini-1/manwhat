import { NextRequest, NextResponse } from 'next/server';
import { getScraper } from '@/lib/sources';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');

  if (!source) {
    return NextResponse.json({ error: 'Source parameter is required' }, { status: 400 });
  }

  const scraper = getScraper(source);
  if (!scraper) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  try {
    const manga = await scraper.getPopularManga();
    return NextResponse.json({
      data: manga.map((m) => ({
        id: m.id,
        attributes: {
          title: {
            en: m.title,
          },
          description: {
            en: m.description || '',
          },
          status: m.status,
          year: m.year,
          tags: m.genres?.map((g) => ({ name: g })) || [],
          coverUrl: m.coverUrl,
        },
      })),
    });
  } catch (error) {
    console.error(`Error scraping from ${source}:`, error);
    return NextResponse.json({ error: 'Failed to scrape manga' }, { status: 500 });
  }
}
