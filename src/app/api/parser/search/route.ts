/**
 * Parser API - Search Manga
 * Mihon-inspired parsing using CSS selectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getParserSource } from '@/lib/parser/sources';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('source') || 'asurascans';
    const query = searchParams.get('query');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const source = getParserSource(sourceId);
    if (!source) {
      return NextResponse.json(
        { error: `Source ${sourceId} not found` },
        { status: 404 }
      );
    }

    console.log(`Parser: Searching ${query} on ${sourceId}, page ${page}`);
    
    const result = await source.getSearchManga(query, page);
    
    // Limit results
    const limitedMangas = result.mangas.slice(0, limit);

    return NextResponse.json({
      data: limitedMangas.map((manga: any) => ({
        id: source.getMangaId(manga.url),
        url: manga.url,
        title: manga.title,
        thumbnailUrl: manga.thumbnailUrl,
        initialized: manga.initialized,
      })),
      hasNextPage: result.hasNextPage,
    });
  } catch (error) {
    console.error('Parser search error:', error);
    return NextResponse.json(
      { error: 'Failed to search manga' },
      { status: 500 }
    );
  }
}

