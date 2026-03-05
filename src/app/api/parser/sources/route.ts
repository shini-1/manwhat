import { NextResponse } from 'next/server';
import { getParserSourceNames } from '@/lib/parser/sources';

export async function GET() {
  try {
    const sources = getParserSourceNames();
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Parser sources error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parser sources' },
      { status: 500 }
    );
  }
}

