/**
 * Mihon-inspired Base Source with CSS Selectors
 * Based on: source-api/src/commonMain/kotlin/eu/kanade/tachiyomi/source/online/ParsedHttpSource.kt
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import {
  SManga,
  SMangaImpl,
  SChapter,
  SChapterImpl,
  Page,
  PageImpl,
  MangasPageImpl,
  ChaptersPageImpl,
  PagesPageImpl,
  MangaStatus,
  UpdateStrategy,
  MangaStatus as Status,
} from './models';

/**
 * Selectors for parsing manga content
 */
export interface SourceSelectors {
  // Popular manga selectors
  popularMangaSelector: string;
  popularMangaTitleAttr: string;
  popularMangaUrlAttr: string;
  popularMangaImgAttr: string;
  popularMangaNextPageSelector: string;

  // Search manga selectors
  searchMangaSelector: string;
  searchMangaTitleAttr: string;
  searchMangaUrlAttr: string;
  searchMangaImgAttr: string;
  searchMangaNextPageSelector: string;

  // Latest updates selectors
  latestUpdatesSelector: string;
  latestUpdatesTitleAttr: string;
  latestUpdatesUrlAttr: string;
  latestUpdatesImgAttr: string;
  latestUpdatesNextPageSelector: string;

  // Manga details selectors
  mangaDetailsTitleSelector: string;
  mangaDetailsAuthorSelector: string;
  mangaDetailsArtistSelector: string;
  mangaDetailsDescriptionSelector: string;
  mangaDetailsStatusSelector: string;
  mangaDetailsGenreSelector: string;
  mangaDetailsThumbnailSelector: string;

  // Chapter list selectors
  chapterListSelector: string;
  chapterNameSelector: string;
  chapterUrlAttr: string;
  chapterDateSelector: string;
  chapterNumberSelector: string;

  // Page list selectors
  pageListSelector: string;
  pageImgAttr: string;
  pageUrlAttr: string;
}

/**
 * Base source configuration
 */
export interface SourceConfig {
  id: string;
  name: string;
  baseUrl: string;
  lang?: string;
  selectors: SourceSelectors;
}

/**
 * Abstract base class for parsed HTTP sources (Mihon ParsedHttpSource equivalent)
 */
export abstract class ParsedHttpSource {
  protected client: AxiosInstance;
  public readonly id: string;
  public readonly name: string;
  public readonly baseUrl: string;
  public readonly lang: string;
  protected selectors: SourceSelectors;

  constructor(config: SourceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.lang = config.lang || 'en';
    this.selectors = config.selectors;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  }

  /**
   * Fetch a page from the source
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async fetch(url: string): Promise<any> {
    const response = await this.client.get(url);
    return cheerio.load(response.data);
  }

  /**
   * Parse popular manga list (Mihon: popularMangaParse)
   */
  async getPopularManga(page: number = 1): Promise<MangasPageImpl> {
    const $ = await this.fetch(this.getPopularMangaUrl(page));
    const elements = $(this.selectors.popularMangaSelector);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mangas = elements.map((_: any, el: any) => this.popularMangaFromElement($(el))).get();
    const hasNextPage = this.hasNextPage($, this.selectors.popularMangaNextPageSelector);

    return MangasPageImpl.create(mangas, hasNextPage);
  }

  /**
   * Get the URL for popular manga page
   */
  protected getPopularMangaUrl(page: number): string {
    return '/';
  }

  /**
   * Parse manga from element (Mihon: popularMangaFromElement)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected popularMangaFromElement($el: any): SManga {
    const manga = SMangaImpl.create();
    
    // Get URL
    const url = $el.attr(this.selectors.popularMangaUrlAttr) || 
                $el.find('a').attr('href') || '';
    manga.url = this.normalizeUrl(url);

    // Get title
    const title = $el.attr(this.selectors.popularMangaTitleAttr) ||
                  $el.find('img').attr('alt') ||
                  $el.find('img').attr('title') ||
                  $el.text().trim() || '';
    manga.title = title.replace(/\n/g, ' ').trim();

    // Get thumbnail
    const thumbnail = $el.find('img').attr(this.selectors.popularMangaImgAttr) ||
                     $el.find('img').attr('data-src') ||
                     $el.find('img').attr('data-lazy-src') || '';
    manga.thumbnailUrl = this.resolveUrl(thumbnail);

    manga.initialized = false;
    return manga;
  }

  /**
   * Parse search results (Mihon: searchMangaParse)
   */
  async getSearchManga(query: string, page: number = 1): Promise<MangasPageImpl> {
    const $ = await this.fetch(this.getSearchMangaUrl(query, page));
    const elements = $(this.selectors.searchMangaSelector);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mangas = elements.map((_: any, el: any) => this.searchMangaFromElement($(el))).get();
    const hasNextPage = this.hasNextPage($, this.selectors.searchMangaNextPageSelector);

    return MangasPageImpl.create(mangas, hasNextPage);
  }

  /**
   * Get the URL for search
   */
  protected getSearchMangaUrl(query: string, page: number): string {
    return `/?s=${encodeURIComponent(query)}`;
  }

  /**
   * Parse manga from search element (Mihon: searchMangaFromElement)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected searchMangaFromElement($el: any): SManga {
    const manga = SMangaImpl.create();
    
    const url = $el.attr(this.selectors.searchMangaUrlAttr) || 
                $el.find('a').attr('href') || '';
    manga.url = this.normalizeUrl(url);

    const title = $el.attr(this.selectors.searchMangaTitleAttr) ||
                  $el.find('img').attr('alt') ||
                  $el.text().trim() || '';
    manga.title = title.replace(/\n/g, ' ').trim();

    const thumbnail = $el.find('img').attr(this.selectors.searchMangaImgAttr) ||
                     $el.find('img').attr('data-src') || '';
    manga.thumbnailUrl = this.resolveUrl(thumbnail);

    manga.initialized = false;
    return manga;
  }

  /**
   * Parse latest updates (Mihon: latestUpdatesParse)
   */
  async getLatestUpdates(page: number = 1): Promise<MangasPageImpl> {
    const $ = await this.fetch(this.getLatestUpdatesUrl(page));
    const elements = $(this.selectors.latestUpdatesSelector);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mangas = elements.map((_: any, el: any) => this.latestUpdatesFromElement($(el))).get();
    const hasNextPage = this.hasNextPage($, this.selectors.latestUpdatesNextPageSelector);

    return MangasPageImpl.create(mangas, hasNextPage);
  }

  /**
   * Get the URL for latest updates
   */
  protected getLatestUpdatesUrl(page: number): string {
    return '/';
  }

  /**
   * Parse manga from latest updates element (Mihon: latestUpdatesFromElement)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected latestUpdatesFromElement($el: any): SManga {
    const manga = SMangaImpl.create();
    
    const url = $el.attr(this.selectors.latestUpdatesUrlAttr) || 
                $el.find('a').attr('href') || '';
    manga.url = this.normalizeUrl(url);

    const title = $el.attr(this.selectors.latestUpdatesTitleAttr) ||
                  $el.find('img').attr('alt') ||
                  $el.text().trim() || '';
    manga.title = title.replace(/\n/g, ' ').trim();

    const thumbnail = $el.find('img').attr(this.selectors.latestUpdatesImgAttr) ||
                     $el.find('img').attr('data-src') || '';
    manga.thumbnailUrl = this.resolveUrl(thumbnail);

    manga.initialized = false;
    return manga;
  }

  /**
   * Parse manga details (Mihon: mangaDetailsParse)
   */
  async getMangaDetails(mangaUrl: string): Promise<SManga> {
    const $ = await this.fetch(mangaUrl);
    return this.mangaDetailsParse($);
  }

  /**
   * Parse manga details from document (Mihon: mangaDetailsParse)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected mangaDetailsParse($: any): SManga {
    const manga = SMangaImpl.create();
    manga.url = $.root().html() ? '' : ''; // URL is set externally
    manga.initialized = true;

    // Title
    const title = $(this.selectors.mangaDetailsTitleSelector).text().trim();
    manga.title = title || 'Unknown';

    // Author
    const author = $(this.selectors.mangaDetailsAuthorSelector).text().trim();
    manga.author = author || undefined;

    // Artist
    const artist = $(this.selectors.mangaDetailsArtistSelector).text().trim();
    manga.artist = artist || undefined;

    // Description
    const description = $(this.selectors.mangaDetailsDescriptionSelector).text().trim();
    manga.description = description || undefined;

    // Status
    const statusText = $(this.selectors.mangaDetailsStatusSelector).text().toLowerCase().trim();
    manga.status = this.parseStatus(statusText);

    // Genres
    const genres: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $(this.selectors.mangaDetailsGenreSelector).each((_: any, el: any) => {
      const genre = $(el).text().trim();
      if (genre) genres.push(genre);
    });
    manga.genre = genres.join(', ');

    // Thumbnail
    const thumbnail = $(this.selectors.mangaDetailsThumbnailSelector).attr('src') ||
                     $(this.selectors.mangaDetailsThumbnailSelector).attr('data-src') || '';
    manga.thumbnailUrl = this.resolveUrl(thumbnail);

    manga.updateStrategy = UpdateStrategy.ALWAYS_UPDATE;
    return manga;
  }

  /**
   * Parse status string to enum (Mihon: status mapping)
   */
  protected parseStatus(statusText: string): MangaStatus {
    if (statusText.includes('ongoing') || statusText.includes('serializing')) {
      return Status.ONGOING;
    }
    if (statusText.includes('complete') || statusText.includes('finished')) {
      return Status.COMPLETED;
    }
    if (statusText.includes('hiatus') || statusText.includes('on hold')) {
      return Status.ON_HIATUS;
    }
    if (statusText.includes('cancelled') || statusText.includes('discontinued')) {
      return Status.CANCELLED;
    }
    if (statusText.includes('licensed')) {
      return Status.LICENSED;
    }
    return Status.UNKNOWN;
  }

  /**
   * Parse chapter list (Mihon: chapterListParse)
   */
  async getChapterList(mangaUrl: string): Promise<ChaptersPageImpl> {
    const $ = await this.fetch(mangaUrl);
    const elements = $(this.selectors.chapterListSelector);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chapters = elements.map((_: any, el: any) => this.chapterFromElement($(el))).get();
    return ChaptersPageImpl.create(chapters);
  }

  /**
   * Parse chapter from element (Mihon: chapterFromElement)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected chapterFromElement($el: any): SChapter {
    const chapter = SChapterImpl.create();

    // URL
    const url = $el.attr(this.selectors.chapterUrlAttr) || 
                $el.find('a').attr('href') || '';
    chapter.url = this.normalizeUrl(url);

    // Name
    const name = $el.find(this.selectors.chapterNameSelector).text().trim();
    chapter.name = name || $el.text().trim() || 'Chapter';

    // Date
    const dateText = $el.find(this.selectors.chapterDateSelector).text().trim();
    chapter.dateUpload = this.parseDate(dateText);

    // Chapter number
    const numberText = $el.find(this.selectors.chapterNumberSelector).text().trim();
    chapter.chapterNumber = this.parseChapterNumber(numberText) || 
                            this.extractChapterNumber(chapter.name);

    return chapter;
  }

  /**
   * Parse date string to timestamp
   */
  protected parseDate(dateText: string): number {
    // Try common date formats
    const now = new Date();
    const datePatterns = [
      // Relative dates
      { regex: /just now/i, fn: () => now.getTime() },
      { regex: /(\d+)\s*min(?:ute)?s?\s*ago/i, fn: (m: RegExpMatchArray) => now.getTime() - parseInt(m[1]) * 60000 },
      { regex: /(\d+)\s*hours?\s*ago/i, fn: (m: RegExpMatchArray) => now.getTime() - parseInt(m[1]) * 3600000 },
      { regex: /(\d+)\s*days?\s*ago/i, fn: (m: RegExpMatchArray) => now.getTime() - parseInt(m[1]) * 86400000 },
      { regex: /yesterday/i, fn: () => now.getTime() - 86400000 },
      // Absolute dates
      { regex: /(\d{4})-(\d{2})-(\d{2})/, fn: (m: RegExpMatchArray) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])).getTime() },
      { regex: /(\d{2})\/(\d{2})\/(\d{4})/, fn: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])).getTime() },
    ];

    for (const pattern of datePatterns) {
      const match = dateText.match(pattern.regex);
      if (match) {
        return pattern.fn(match);
      }
    }

    return 0;
  }

  /**
   * Parse chapter number from text
   */
  protected parseChapterNumber(text: string): number {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract chapter number from name
   */
  protected extractChapterNumber(name: string): number {
    const match = name.match(/ch(?:apter)?\.?\s*(\d+)/i) ||
                  name.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Parse page list / images (Mihon: pageListParse)
   */
  async getPageList(chapterUrl: string): Promise<PagesPageImpl> {
    const $ = await this.fetch(chapterUrl);
    return this.pageListParse($);
  }

  /**
   * Parse pages from document (Mihon: pageListParse)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected pageListParse($: any): PagesPageImpl {
    const elements = $(this.selectors.pageListSelector);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages = elements.map((index: any, el: any) => {
      const page = PageImpl.create(index);
      
      // Image URL
      const imgUrl = $(el).attr(this.selectors.pageImgAttr) ||
                     $(el).find('img').attr('src') ||
                     $(el).find('img').attr('data-src') || '';
      page.imageUrl = this.resolveUrl(imgUrl);

      // Page URL (if different)
      const pageUrl = $(el).attr(this.selectors.pageUrlAttr);
      page.url = pageUrl ? this.resolveUrl(pageUrl) : page.imageUrl;

      return page;
    }).get();

    return PagesPageImpl.create(pages);
  }

  /**
   * Get image URL for a page (Mihon: imageUrlParse)
   */
  async getImageUrl(pageUrl: string): Promise<string> {
    const $ = await this.fetch(pageUrl);
    return this.imageUrlParse($);
  }

  /**
   * Extract image URL from page (Mihon: imageUrlParse)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected imageUrlParse($: any): string {
    // Default: try common image selectors
    const imgSelectors = [
      '#page img',
      '.page-img img',
      '.reader-content img',
      '.vuwChapter img',
      'img[data-src]',
      'img[src]',
    ];

    for (const selector of imgSelectors) {
      const img = $(selector).first();
      if (img.length) {
        return img.attr('data-src') || img.attr('src') || '';
      }
    }

    return '';
  }

  /**
   * Check if there's a next page
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected hasNextPage($: any, selector: string | null): boolean {
    if (!selector) return false;
    return $(selector).length > 0;
  }

  /**
   * Normalize URL to absolute
   */
  protected normalizeUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return this.baseUrl + url;
  }

  /**
   * Resolve URL (handles relative URLs)
   */
  protected resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return this.baseUrl + url;
    return this.baseUrl + '/' + url;
  }

  /**
   * Extract manga ID from URL
   */
  public getMangaId(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }
}

