import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Manga from '@/lib/models/Manga';

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

async function fetchPopularManga(contentType: string, limit: number): Promise<MangaDexManga[]> {
  const response = await axios.get(`${MANGADEX_API}/manga`, {
    params: {
      'includes[]': 'cover_art',
      'contentRating[]': ['safe', 'suggestive'],
      'order[followedCount]': 'desc',
      limit: limit,
      offset: Math.floor(Math.random() * 100), // Random offset to get variety
    },
  });

  // Filter by content type if specified
  if (contentType === 'manga') {
    return response.data.data.filter((m: MangaDexManga) => 
      !m.attributes.tags.some((tag: any) => 
        tag.attributes.name.en?.toLowerCase().includes('manhwa') || 
        tag.attributes.name.en?.toLowerCase().includes('manhua')
      )
    ).slice(0, limit);
  }

  return response.data.data;
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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Check if we already have popular manga
    const existingCount = await Manga.countDocuments();
    if (existingCount > 0) {
      return NextResponse.json({ 
        message: 'Popular manga already initialized',
        count: existingCount 
      });
    }

    const contentTypes = ['manga']; // manga includes all types
    const limitPerType = 50;
    const totalToFetch = limitPerType; // 50 each

    console.log(`Initializing ${totalToFetch} popular manga...`);

    const allManga: Array<{
      mangaId: string;
      title: string;
      description: string;
      status: string;
      year: number;
      tags: string[];
      coverUrl: string;
    }> = [];

    // Fetch popular manga with different offsets for variety
    const popularManga = await axios.get(`${MANGADEX_API}/manga`, {
      params: {
        'includes[]': 'cover_art',
        'contentRating[]': ['safe', 'suggestive'],
        'order[followedCount]': 'desc',
        limit: totalToFetch,
        offset: 0,
      },
    });

    // Process and save manga
    const mangaData = popularManga.data.data;
    
    for (let i = 0; i < Math.min(mangaData.length, totalToFetch); i++) {
      const m = mangaData[i] as MangaDexManga;
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

      allManga.push({
        mangaId,
        title: getTitle(m.attributes),
        description: getDescription(m.attributes),
        status: m.attributes.status || 'unknown',
        year: m.attributes.year || 0,
        tags,
        coverUrl: coverUrl || '',
      });
    }

    // Bulk insert with upsert
    for (const manga of allManga) {
      await Manga.findOneAndUpdate(
        { mangaId: manga.mangaId },
        {
          mangaId: manga.mangaId,
          title: manga.title,
          description: manga.description,
          status: manga.status,
          year: manga.year,
          tags: manga.tags,
          coverUrl: manga.coverUrl,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    const savedCount = await Manga.countDocuments();
    console.log(`Successfully initialized ${savedCount} popular manga`);

    return NextResponse.json({
      message: `Successfully initialized ${savedCount} popular manga`,
      count: savedCount,
    });

  } catch (error) {
    console.error('Error initializing popular manga:', error);
    return NextResponse.json(
      { error: 'Failed to initialize popular manga' },
      { status: 500 }
    );
  }
}
