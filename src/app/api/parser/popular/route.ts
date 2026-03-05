/**
 * Parser API - Get Popular Manga
 * Mihon-inspired parsing using CSS selectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getParserSource } from '@/lib/parser/sources';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('source') || 'asurascans';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const source = getParserSource(sourceId);
    if (!source) {
      return NextResponse.json(
        { error: `Source ${sourceId} not found` },
        { status: 404 }
      );
    }

    console.log(`Parser: Fetching popular manga from ${sourceId}, page ${page}`);
    
    const result = await source.getPopularManga(page);
    
    // Limit results
    const limitedMangas = result.mangas.slice(0, limit);

    return NextResponse.json({
      data: limitedMangas.map(manga => ({
        id: source.getMangaId(manga.url),
        url: manga.url,
        title: manga.title,
        thumbnailUrl: manga.thumbnailUrl,
        initialized: manga.initialized,
      })),
      hasNextPage: result.hasNextPage,
    });
  } catch (error) {
    console.error('Parser popular error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular manga' },
      { status: 500 }
    );
  }
}

