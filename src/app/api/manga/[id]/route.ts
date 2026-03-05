import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

// UUID regex for MangaDex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ComickChapter {
  id: string;
  title: string;
  vol?: string;
  chap?: string;
}

interface ComickManga {
  id?: string;
  title?: string;
  desc?: string;
  status?: string;
  year?: number;
  genres?: string[];
  cover_url?: string;
  chapters?: ComickChapter[];
}

interface AnilistMedia {
  id: number;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
  description: string | null;
  status: string;
  genres: string[];
  coverImage: {
    large: string | null;
    medium: string | null;
  };
  siteUrl: string;
  startDate: {
    year: number | null;
  };
}

interface MangaDexResponse {
  result: string;
  response: string;
  data: {
    id: string;
    type: string;
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
      lastChapter?: string;
    };
    relationships?: Array<{
      id: string;
      type: string;
      attributes?: {
        fileName?: string;
      };
    }>;
  };
}

// Comick API - fetch by slug or ID
async function fetchFromComick(identifier: string): Promise<MangaDexResponse | null> {
  try {
    const response = await axios.get<MangaDexResponse>(`https://api.comick.fun/comic/${identifier}`, {
      params: { lang: 'en' },
      timeout: 10000,
    });
    
    const data = response.data as unknown as ComickManga;
    
    // Convert Comick format to MangaDex-like format
    return {
      result: 'ok',
      response: 'ok',
      data: {
        id: data.id?.toString() || identifier,
        type: 'manga',
        attributes: {
          title: { en: data.title || 'Untitled' },
          description: { en: data.desc || '' },
          status: data.status || 'unknown',
          year: data.year,
          tags: (data.genres || []).map((g) => ({ attributes: { name: { en: g } } })),
          lastChapter: data.chapters?.[0]?.chap,
        },
        relationships: data.cover_url ? [{
          id: 'cover',
          type: 'cover_art',
          attributes: { fileName: data.cover_url.split('/').pop() }
        }] : [],
      },
    };
  } catch {
    return null;
  }
}

// Anilist API - search by ID
async function fetchFromAnilist(id: string): Promise<MangaDexResponse | null> {
  const query = `
    query ($id: Int!) {
      Media(id: $id, type: MANGA) {
        id
        title {
          english
          romaji
          native
        }
        description
        status
        genres
        coverImage {
          large
          medium
        }
        siteUrl
        startDate {
          year
        }
      }
    }
  `;

  try {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return null;

    const response = await axios.post(
      'https://graphql.anilist.co',
      { query, variables: { id: numericId } },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    
    const media = response.data.data.Media as AnilistMedia;
    
    return {
      result: 'ok',
      response: 'ok',
      data: {
        id: media.id.toString(),
        type: 'manga',
        attributes: {
          title: { 
            en: media.title?.english || media.title?.romaji || 'Untitled' 
          },
          description: { en: media.description?.replace(/<[^>]*>/g, '') || '' },
          status: media.status?.toLowerCase() || 'unknown',
          year: media.startDate?.year || undefined,
          tags: (media.genres || []).map((g) => ({ attributes: { name: { en: g } } })),
        },
        relationships: media.coverImage?.large ? [{
          id: 'cover',
          type: 'cover_art',
          attributes: { fileName: media.coverImage.large.split('/').pop() }
        }] : [],
      },
    };
  } catch {
    return null;
  }
}

// MangaDex API - fetch by UUID
async function fetchFromMangaDex(id: string): Promise<MangaDexResponse | null> {
  try {
    const response = await axios.get<MangaDexResponse>(`https://api.mangadex.org/manga/${id}`, {
      timeout: 10000,
    });
    return response.data;
  } catch {
    return null;
  }
}

// Try to find manga by searching MangaDex
async function searchMangaDex(title: string): Promise<MangaDexResponse['data'] | null> {
  try {
    const response = await axios.get<{ result: string; response: string; data: MangaDexResponse['data'][] }>('https://api.mangadex.org/manga', {
      params: {
        title: title,
        limit: 1,
      },
      timeout: 10000,
    });
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || id.trim().length === 0) {
    return NextResponse.json({ error: 'ID parameter is required and cannot be empty' }, { status: 400 });
  }

  // Try cache first
  const cacheKey = `manga:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  let mangaData: MangaDexResponse | null = null;
  let source = '';

  // Check if it's a UUID (MangaDex format)
  if (uuidRegex.test(id)) {
    console.log(`Fetching manga ${id} from MangaDex (UUID format)`);
    mangaData = await fetchFromMangaDex(id);
    source = 'mangadex';
  }

  // If not found or not UUID, try Comick API
  if (!mangaData) {
    console.log(`Trying to fetch manga ${id} from Comick`);
    const comickData = await fetchFromComick(id);
    if (comickData) {
      mangaData = comickData;
      source = 'comick';
    }
  }

  // If still not found, try Anilist
  if (!mangaData) {
    console.log(`Trying to fetch manga ${id} from Anilist`);
    const anilistData = await fetchFromAnilist(id);
    if (anilistData) {
      mangaData = anilistData;
      source = 'anilist';
    }
  }

  // If still not found, try searching MangaDex by ID as title
  if (!mangaData) {
    console.log(`Trying to search manga ${id} on MangaDex`);
    const searchResult = await searchMangaDex(id);
    if (searchResult) {
      mangaData = { result: 'ok', response: 'ok', data: searchResult };
      source = 'mangadex-search';
    }
  }

  if (!mangaData) {
    return NextResponse.json({ error: 'Manga not found' }, { status: 404 });
  }

  console.log(`Successfully fetched manga from ${source}`);

  // Cache the result for 5 minutes
  cache.set(cacheKey, mangaData, 5 * 60 * 1000);

  return NextResponse.json(mangaData);
}

