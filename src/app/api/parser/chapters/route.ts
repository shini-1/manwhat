/**
 * Parser API - Get Chapter List
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

    console.log(`Parser: Fetching chapters from ${sourceId} for ${mangaUrl}`);
    
    const result = await source.getChapterList(mangaUrl);

    return NextResponse.json({
      data: result.chapters.map(chapter => ({
        url: chapter.url,
        name: chapter.name,
        dateUpload: chapter.dateUpload,
        chapterNumber: chapter.chapterNumber,
        scanlator: chapter.scanlator,
      })),
    });
  } catch (error) {
    console.error('Parser chapters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

