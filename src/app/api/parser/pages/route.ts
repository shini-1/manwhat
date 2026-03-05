/**
 * Parser API - Get Page List (Chapter Images)
 * Mihon-inspired parsing using CSS selectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getParserSource } from '@/lib/parser/sources';
import { Page } from '@/lib/parser/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('source') || 'asurascans';
    const chapterUrl = searchParams.get('url');

    if (!chapterUrl) {
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

    console.log(`Parser: Fetching pages from ${sourceId} for ${chapterUrl}`);
    
    const result = await source.getPageList(chapterUrl);

    return NextResponse.json({
      data: result.pages.map((page: Page) => ({
        index: page.index,
        url: page.url,
        imageUrl: page.imageUrl,
      })),
    });
  } catch (error) {
    console.error('Parser pages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

