import { NextRequest, NextResponse } from 'next/server';
import { scrapeSource } from '@/lib/sources';
import axios from 'axios';

const MANGADEX_API = 'https://api.mangadex.org';

interface MangaDexManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    description?: Record<string, string>;
    status: string;
    year?: number;
    tags: Array<{
      attributes: {
        name: Record<string, string>;
      };
    }>;
    coverFileName?: string;
  };
}

async function getCoverUrl(mangaId: string): Promise<string | undefined> {
  try {
    const response = await axios.get(`${MANGADEX_API}/cover`, {
      params: {
        'manga[]': mangaId,
        limit: 1,
      },
    });
    if (response.data.data && response.data.data.length > 0) {
      return `https://uploads.mangadex.org/covers/${mangaId}/${response.data.data[0].attributes.fileName}`;
    }
  } catch (error) {
    console.error('Error fetching cover:', error);
  }
  return undefined;
}

function getTitle(attributes: MangaDexManga['attributes']): string {
  return attributes.title.en || 
         attributes.title['ja-ro'] || 
         Object.values(attributes.title)[0] || 
         'Untitled';
}

function getDescription(attributes: MangaDexManga['attributes']): string {
  return attributes.description?.en || 
         Object.values(attributes.description || {})[0] || 
         '';
}

async function fetchMangaDexManga(limit: number): Promise<any[]> {
  const response = await axios.get(`${MANGADEX_API}/manga`, {
    params: {
      'includes[]': 'cover_art',
      'contentRating[]': ['safe', 'suggestive'],
      'order[followedCount]': 'desc',
      limit: limit,
    },
  });

  const mangaData = response.data.data as MangaDexManga[];
  const results: any[] = [];

  for (const m of mangaData.slice(0, limit)) {
    const mangaId = m.id;
    let coverUrl: string | undefined;
    try {
      coverUrl = await getCoverUrl(mangaId);
    } catch (e) {
      console.log(`Could not get cover for ${mangaId}`);
    }

    const tags = m.attributes.tags
      ?.slice(0, 5)
      ?.map((tag) => tag.attributes.name.en)
      ?.filter(Boolean) || [];

    results.push({
      id: mangaId,
      title: getTitle(m.attributes),
      description: getDescription(m.attributes),
      status: m.attributes.status || 'unknown',
      coverUrl: coverUrl || '',
      genres: tags,
      url: `https://mangadex.org/manga/${mangaId}`,
    });
  }

  return results;
}

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
    
    let mangaList: any[] = [];

    // Try to scrape from external sources first
    try {
      mangaList = await scrapeSource(sourceId);
    } catch (scrapeError) {
      console.error('External scrape failed, using fallback:', scrapeError);
    }

    // If external scraping fails or returns empty, fall back to MangaDex
    if (!mangaList || mangaList.length === 0) {
      console.log(`External source "${sourceId}" unavailable, using MangaDex fallback`);
      mangaList = await fetchMangaDexManga(limit);
    }

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
