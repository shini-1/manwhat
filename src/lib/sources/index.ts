import { scrapeAsuraScans, ScrapedManga } from './asurascans';
import { scrapeManganato } from './manganato';
import { scrapeMangakakalot } from './mangakakalot';
import axios from 'axios';

export interface MangaSource {
  id: string;
  name: string;
  url: string;
  scrape: () => Promise<ScrapedManga[]>;
}

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

function getTitle(attributes: MangaDexManga['attributes']): string {
  return attributes.title.en || 
         attributes.title['ja-ro'] || 
         Object.values(attributes.title)[0] || 
         'Untitled';
}

async function fetchMangaDexManga(limit: number): Promise<ScrapedManga[]> {
  const response = await axios.get(`${MANGADEX_API}/manga`, {
    params: {
      'includes[]': 'cover_art',
      'contentRating[]': ['safe', 'suggestive'],
      'order[followedCount]': 'desc',
      limit: limit,
    },
  });

  const mangaData = response.data.data as MangaDexManga[];
  const results: ScrapedManga[] = [];

  for (const m of mangaData.slice(0, limit)) {
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

    results.push({
      id: mangaId,
      title: getTitle(m.attributes),
      description: Object.values(m.attributes.description || {})[0] || '',
      status: m.attributes.status || 'unknown',
      coverUrl: coverUrl || '',
      genres: tags,
      url: `https://mangadex.org/manga/${mangaId}`,
    });
  }

  return results;
}

/**
 * Wrapper function that adds MangaDex fallback to any source scraper.
 * If the source fails or returns empty results, it falls back to MangaDex.
 */
async function scrapeWithFallback(
  sourceScraper: () => Promise<ScrapedManga[]>,
  sourceName: string,
  limit: number = 50
): Promise<ScrapedManga[]> {
  try {
    // Try to scrape from the external source first
    const mangaList = await sourceScraper();
    
    // If we got results, return them
    if (mangaList && mangaList.length > 0) {
      console.log(`${sourceName}: Successfully scraped ${mangaList.length} manga`);
      return mangaList;
    }
    
    // If external source returns empty, try MangaDex fallback
    console.log(`${sourceName}: External source returned empty, using MangaDex fallback`);
    const fallbackResults = await fetchMangaDexManga(limit);
    console.log(`MangaDex fallback: Retrieved ${fallbackResults.length} manga`);
    return fallbackResults;
  } catch (error) {
    // If external source fails completely, use MangaDex fallback
    console.error(`${sourceName}: External source failed, using MangaDex fallback:`, error);
    const fallbackResults = await fetchMangaDexManga(limit);
    console.log(`MangaDex fallback: Retrieved ${fallbackResults.length} manga`);
    return fallbackResults;
  }
}

export const sources: MangaSource[] = [
  {
    id: 'asurascans',
    name: 'Asura Scans',
    url: 'https://asurascans.com',
    scrape: () => scrapeWithFallback(scrapeAsuraScans, 'AsuraScans'),
  },
  {
    id: 'manganato',
    name: 'Manganato',
    url: 'https://manganato.com',
    scrape: () => scrapeWithFallback(scrapeManganato, 'Manganato'),
  },
  {
    id: 'mangakakalot',
    name: 'Mangakakalot',
    url: 'https://mangakakalot.com',
    scrape: () => scrapeWithFallback(scrapeMangakakalot, 'Mangakakalot'),
  },
];

export async function scrapeSource(sourceId: string): Promise<ScrapedManga[]> {
  const source = sources.find(s => s.id === sourceId);
  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }
  return source.scrape();
}

export function getSources() {
  return sources.map(s => ({ id: s.id, name: s.name, url: s.url }));
}

// This function returns all available source IDs/names
export function getAllSourceNames(): string[] {
  return sources.map(s => s.id);
}
