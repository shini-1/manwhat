/**
 * Parser API - Get Manga Details
 * Mihon-inspired parsing using CSS selectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getParserSource } from '@/lib/parser/sources';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('source') || 'asurascans';
    const mangaUrl = searchParams.get('url');

    if (!mangaUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
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

    console.log(`Parser: Fetching details from ${sourceId} for ${mangaUrl}`);
    
    const manga = await source.getMangaDetails(mangaUrl);

    return NextResponse.json({
      data: {
        url: manga.url,
        title: manga.title,
        author: manga.author,
        artist: manga.artist,
        description: manga.description,
        genre: manga.genre,
        status: manga.status,
        thumbnailUrl: manga.thumbnailUrl,
        initialized: manga.initialized,
      },
    });
  } catch (error) {
    console.error('Parser details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manga details' },
      { status: 500 }
    );
  }
}

