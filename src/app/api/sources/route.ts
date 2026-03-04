import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';
import { getAllSourceNames } from '@/lib/sources';

// GET - List all available sources
export async function GET(request: NextRequest) {
  try {
    // Get built-in scrapers (always available)
    const builtInSources = getAllSourceNames().map((name) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1'),
      scraper: name,
      isBuiltIn: true,
    }));

    // Try to get custom sources from database, but don't fail if DB is unavailable
    let customSources: Array<{ name: string; url: string; scraper: string }> = [];
    try {
      await dbConnect();
      const dbSources = await Source.find({}).lean();
      customSources = dbSources.map((s) => ({
        name: String(s.name),
        url: String(s.url),
        scraper: String(s.scraper),
      }));
    } catch (dbError) {
      console.warn('Database connection failed, returning only built-in sources:', dbError);
    }

    return NextResponse.json({
      data: [
        ...builtInSources,
        ...customSources.map((s) => ({
          name: s.name,
          url: s.url,
          scraper: s.scraper,
          isBuiltIn: false,
        })),
      ],
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

// POST - Add a new custom source
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, url, scraper } = body;

    if (!name || !url || !scraper) {
      return NextResponse.json(
        { error: 'Name, URL, and scraper are required' },
        { status: 400 }
      );
    }

    // Check if source already exists
    const existingSource = await Source.findOne({ url });
    if (existingSource) {
      return NextResponse.json(
        { error: 'Source with this URL already exists' },
        { status: 400 }
      );
    }

    const newSource = await Source.create({
      name,
      url,
      scraper,
      active: true,
    });

    return NextResponse.json({ data: newSource }, { status: 201 });
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}
