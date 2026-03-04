// Source scraper interface
export interface ScraperResult {
  id: string;
  title: string;
  coverUrl?: string;
  description?: string;
  status?: string;
  author?: string;
  genres?: string[];
  chapters?: number;
  url: string;
  year?: number;
}

export interface SourceScraper {
  name: string;
  baseUrl: string;
  getPopularManga(): Promise<ScraperResult[]>;
  searchManga(query: string): Promise<ScraperResult[]>;
  getMangaDetails(id: string): Promise<ScraperResult>;
}

// Export all available scrapers
import asuraScansScraper from './asurascans';
import manganatoScraper from './manganato';
import mangakakalotScraper from './mangakakalot';

export const sources: Record<string, SourceScraper> = {
  asurascans: asuraScansScraper,
  manganato: manganatoScraper,
  mangakakalot: mangakakalotScraper,
};

export function getScraper(scraperName: string): SourceScraper | null {
  return sources[scraperName] || null;
}

export function getAllSourceNames(): string[] {
  return Object.keys(sources);
}
