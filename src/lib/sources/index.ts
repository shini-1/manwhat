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
const COMICK_API = 'https://api.comick.fun';
const ANILIST_API = 'https://graphql.anilist.co';

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

interface ComickManga {
  id: string;
  title: string;
  cover_url?: string;
  slug?: string;
  status?: string;
  genres?: string[];
  desc?: string;
}

interface AnilistMedia {
  id: number;
  title: {
    english: string | null;
    romaji: string | null;
    native: string | null;
  };
  description: string | null;
  coverImage: {
    large: string | null;
    medium: string | null;
  };
  status: string;
  genres: string[];
  siteUrl: string;
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
    console.error('Error fetching MangaDex cover:', error);
  }
  return undefined;
}

function getTitle(attributes: MangaDexManga['attributes']): string {
  return attributes.title.en || 
         attributes.title['ja-ro'] || 
         Object.values(attributes.title)[0] || 
         'Untitled';
}

/**
 * Fetch manga from MangaDex API
 */
async function fetchMangaDexManga(limit: number): Promise<ScrapedManga[]> {
  try {
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

    console.log(`MangaDex: Successfully fetched ${results.length} manga`);
    return results;
  } catch (error) {
    console.error('MangaDex API error:', error);
    return [];
  }
}

/**
 * Fetch manga from Comick API
 */
async function fetchComickManga(limit: number): Promise<ScrapedManga[]> {
  try {
    const response = await axios.get(`${COMICK_API}/home`, {
      params: {
        limit: limit,
        lang: 'en',
      },
      timeout: 15000,
    });

    const comics = response.data as ComickManga[];
    const results: ScrapedManga[] = comics.slice(0, limit).map((comic) => ({
      id: comic.id.toString(),
      title: comic.title || 'Untitled',
      coverUrl: comic.cover_url || '',
      url: comic.slug ? `https://comick.fun/comic/${comic.slug}` : '',
      status: comic.status || 'unknown',
      genres: comic.genres || [],
      description: comic.desc || '',
    }));

    console.log(`Comick: Successfully fetched ${results.length} manga`);
    return results;
  } catch (error) {
    console.error('Comick API error:', error);
    return [];
  }
}

/**
 * Fetch manga from Anilist API using GraphQL
 */
async function fetchAnilistManga(limit: number): Promise<ScrapedManga[]> {
  const query = `
    query ($limit: Int) {
      Page(perPage: $limit) {
        media(type: MANGA, sort: TRENDING_DESC, isAdult: false) {
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
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      ANILIST_API,
      {
        query,
        variables: { limit },
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const media = response.data.data.Page.media as AnilistMedia[];
    const results: ScrapedManga[] = media.slice(0, limit).map((m) => ({
      id: m.id.toString(),
      title: m.title.english || m.title.romaji || m.title.native || 'Untitled',
      description: m.description?.replace(/<[^>]*>/g, '') || '',
      status: m.status?.toLowerCase() || 'unknown',
      coverUrl: m.coverImage.large || m.coverImage.medium || '',
      genres: m.genres || [],
      url: m.siteUrl || '',
    }));

    console.log(`Anilist: Successfully fetched ${results.length} manga`);
    return results;
  } catch (error) {
    console.error('Anilist API error:', error);
    return [];
  }
}

/**
 * Fallback chain: tries multiple sources in order until one succeeds
 * Returns results from the first source that returns non-empty results
 */
async function scrapeWithFallbackChain(
  sourceScraper: () => Promise<ScrapedManga[]>,
  sourceName: string,
  limit: number = 50
): Promise<ScrapedManga[]> {
  // First try the external source
  try {
    console.log(`Attempting to scrape from ${sourceName}...`);
    const mangaList = await sourceScraper();
    
    // If we got non-empty results, return them
    if (mangaList && mangaList.length > 0) {
      console.log(`${sourceName}: Successfully scraped ${mangaList.length} manga`);
      return mangaList;
    }
    
    // Log that source returned empty but don't fallback immediately
    console.log(`${sourceName}: Source returned empty results, trying fallback sources...`);
  } catch (error) {
    console.error(`${sourceName}: Source failed with error:`, error);
  }

  // Try Comick as first fallback
  console.log('Trying Comick as fallback...');
  const comickResults = await fetchComickManga(limit);
  if (comickResults.length > 0) {
    console.log(`Comick fallback: Retrieved ${comickResults.length} manga`);
    return comickResults;
  }

  // Try Anilist as second fallback
  console.log('Trying Anilist as fallback...');
  const anilistResults = await fetchAnilistManga(limit);
  if (anilistResults.length > 0) {
    console.log(`Anilist fallback: Retrieved ${anilistResults.length} manga`);
    return anilistResults;
  }

  // Try MangaDex as final fallback
  console.log('Trying MangaDex as final fallback...');
  const mangaDexResults = await fetchMangaDexManga(limit);
  if (mangaDexResults.length > 0) {
    console.log(`MangaDex fallback: Retrieved ${mangaDexResults.length} manga`);
    return mangaDexResults;
  }

  // If all sources fail, return empty array
  console.error('All sources failed to return results');
  return [];
}

export const sources: MangaSource[] = [
  {
    id: 'asurascans',
    name: 'Asura Scans',
    url: 'https://asurascans.com',
    scrape: () => scrapeWithFallbackChain(scrapeAsuraScans, 'AsuraScans'),
  },
  {
    id: 'manganato',
    name: 'Manganato',
    url: 'https://manganato.com',
    scrape: () => scrapeWithFallbackChain(scrapeManganato, 'Manganato'),
  },
  {
    id: 'mangakakalot',
    name: 'Mangakakalot',
    url: 'https://mangakakalot.com',
    scrape: () => scrapeWithFallbackChain(scrapeMangakakalot, 'Mangakakalot'),
  },
  {
    id: 'comick',
    name: 'Comick',
    url: 'https://comick.fun',
    scrape: () => fetchComickManga(50),
  },
  {
    id: 'anilist',
    name: 'Anilist',
    url: 'https://anilist.co',
    scrape: () => fetchAnilistManga(50),
  },
  {
    id: 'mangadex',
    name: 'MangaDex',
    url: 'https://mangadex.org',
    scrape: () => fetchMangaDexManga(50),
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

