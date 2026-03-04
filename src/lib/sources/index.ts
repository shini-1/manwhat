import { scrapeAsuraScans, ScrapedManga } from './asurascans';
import { scrapeManganato } from './manganato';
import { scrapeMangakakalot } from './mangakakalot';

export interface MangaSource {
  id: string;
  name: string;
  url: string;
  scrape: () => Promise<ScrapedManga[]>;
}

export const sources: MangaSource[] = [
  {
    id: 'asurascans',
    name: 'Asura Scans',
    url: 'https://asurascans.com',
    scrape: scrapeAsuraScans,
  },
  {
    id: 'manganato',
    name: 'Manganato',
    url: 'https://manganato.com',
    scrape: scrapeManganato,
  },
  {
    id: 'mangakakalot',
    name: 'Mangakakalot',
    url: 'https://mangakakalot.com',
    scrape: scrapeMangakakalot,
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
