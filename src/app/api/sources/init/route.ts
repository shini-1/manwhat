import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Source from '@/lib/models/Source';

export async function GET() {
  try {
    await dbConnect();

    // Check if sources already exist
    const existingSources = await Source.find({});
    if (existingSources.length > 0) {
      return NextResponse.json({ message: 'Sources already initialized' });
    }

    // Initialize with some default sources
    const defaultSources = [
      {
        name: 'Asura Scans',
        url: 'https://asurascans.com',
        scraper: 'asurascans',
        active: true,
      },
      {
        name: 'MangaNato',
        url: 'https://manganato.com',
        scraper: 'manganato',
        active: true,
      },
      {
        name: 'Mangakakalot',
        url: 'https://mangakakalot.com',
        scraper: 'mangakakalot',
        active: true,
      },
    ];

    await Source.insertMany(defaultSources);

    return NextResponse.json({ message: 'Sources initialized successfully' });
  } catch (error) {
    console.error('Error initializing sources:', error);
    return NextResponse.json({ error: 'Failed to initialize sources' }, { status: 500 });
  }
}
