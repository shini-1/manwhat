import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { scrapeSource } from '@/lib/sources';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();

  if (!title || title.length === 0) {
    return NextResponse.json({ error: 'Title parameter is required and cannot be empty' }, { status: 400 });
  }

  if (title.length > 100) {
    return NextResponse.json({ error: 'Title parameter is too long (max 100 characters)' }, { status: 400 });
  }

  try {
    // Try to scrape from sources first
    const source = searchParams.get('source') || 'mangadex';
    
    // If user wants to search from a specific source that supports scraping
    if (['asurascans', 'manganato', 'mangakakalot', 'comick', 'anilist', 'mangadex'].includes(source)) {
      const mangaList = await scrapeSource(source);
      
      // Filter by search term
      const filtered = mangaList.filter(m => 
        m.title.toLowerCase().includes(title.toLowerCase())
      ).slice(0, 20);

      if (filtered.length > 0) {
        return NextResponse.json({
          data: filtered.map((manga) => ({
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
      }
    }

    // Fallback to MangaDex API search
    console.log(`Searching MangaDex for: ${title}`);
    const response = await axios.get('https://api.mangadex.org/manga', {
      params: {
        title: title,
        limit: 20,
        'includes[]': 'cover_art',
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching manga:', error);
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400) {
        return NextResponse.json({ error: 'Invalid search parameters' }, { status: 400 });
      }
      if (error.response.status === 404) {
        return NextResponse.json({ error: 'No manga found matching the title' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch manga from external API' }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

