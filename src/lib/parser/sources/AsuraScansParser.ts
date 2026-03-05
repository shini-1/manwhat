/**
 * AsuraScans Parser - Mihon-inspired selector-based parsing
 * Based on Mihon's ParsedHttpSource pattern
 */

import { ParsedHttpSource, SourceSelectors, SourceConfig } from '../BaseSource';

// CSS Selectors for AsuraScans
const asuraScansSelectors: SourceSelectors = {
  // Popular manga
  popularMangaSelector: '.pop-grid .pop-item, .bs .bsx, .list-update .update-item, a[href*="/manga/"]:has(img)',
  popularMangaTitleAttr: 'title',
  popularMangaUrlAttr: 'href',
  popularMangaImgAttr: 'src',
  popularMangaNextPageSelector: '.pagination .next a, a[rel="next"]',

  // Search manga
  searchMangaSelector: '.search-results .result-item, .manga-list .manga-item, a[href*="/manga/"]:has(img)',
  searchMangaTitleAttr: 'title',
  searchMangaUrlAttr: 'href',
  searchMangaImgAttr: 'src',
  searchMangaNextPageSelector: '.pagination .next a',

  // Latest updates
  latestUpdatesSelector: '.list-update .update-item, .bs .bsx, a[href*="/manga/"]:has(img)',
  latestUpdatesTitleAttr: 'title',
  latestUpdatesUrlAttr: 'href',
  latestUpdatesImgAttr: 'src',
  latestUpdatesNextPageSelector: '.pagination .next a',

  // Manga details
  mangaDetailsTitleSelector: '.-title, .post-title, h1.title, h1',
  mangaDetailsAuthorSelector: '.author, .artist, .story-info .info-author, .fmed b:contains("Author")',
  mangaDetailsArtistSelector: '.artist, .story-info .info-artist',
  mangaDetailsDescriptionSelector: '.description, .entry-content, .story-description, .summary',
  mangaDetailsStatusSelector: '.status, .story-info .info-status, .fmed b:contains("Status")',
  mangaDetailsGenreSelector: '.genres a, .tags a, .genre a, .story-info .info-genre a',
  mangaDetailsThumbnailSelector: '.thumb img, .cover img, .entry-thumb img',

  // Chapter list
  chapterListSelector: '.chapter-list li, .chapters-list .chapter, .episode-list li, .mainchapter',
  chapterNameSelector: '.chapter-title, .chapternum, a',
  chapterUrlAttr: 'href',
  chapterDateSelector: '.chapter-date, .date, span:contains("ago")',
  chapterNumberSelector: '.chapter-number, .chapternum',

  // Page list
  pageListSelector: '.chapter-container .page-img, .reader-area img, .vuwChapter img, .page-break img',
  pageImgAttr: 'src',
  pageUrlAttr: 'src',
};

const asuraScansConfig: SourceConfig = {
  id: 'asurascans',
  name: 'Asura Scans',
  baseUrl: 'https://asurascans.com',
  lang: 'en',
  selectors: asuraScansSelectors,
};

export class AsuraScansParser extends ParsedHttpSource {
  constructor() {
    super(asuraScansConfig);
  }

  protected getPopularMangaUrl(page: number): string {
    return page > 1 ? `/page/${page}` : '/';
  }

  protected getSearchMangaUrl(query: string, page: number): string {
    return `/?s=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;
  }

  protected getLatestUpdatesUrl(page: number): string {
    return page > 1 ? `/page/${page}` : '/';
  }

  /**
   * Override manga details parser for AsuraScans-specific HTML
   */
  protected async fetchMangaDetails(mangaUrl: string) {
    const $ = await this.fetch(mangaUrl);
    
    // Try multiple patterns for title
    let title = '';
    const titleSelectors = ['.entry-title', '.post-title h1', 'h1.title', '.manga-title h1', 'h1'];
    for (const selector of titleSelectors) {
      title = $(selector).text().trim();
      if (title) break;
    }

    // Try multiple patterns for description
    let description = '';
    const descSelectors = ['.description .summary', '.entry-content', '.story-description', '.summary'];
    for (const selector of descSelectors) {
      description = $(selector).text().trim();
      if (description) break;
    }

    // Author/Artist
    let author = '';
    let artist = '';
    const infoSelectors = $('.story-info .info, .fmed .ftr');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    infoSelectors.each((_: any, el: any) => {
      const label = $(el).find('b, span:first-child').text().toLowerCase();
      const value = $(el).find('span:last-child, a').text().trim();
      if (label.includes('author')) author = value;
      if (label.includes('artist')) artist = value;
    });

    // Status
    let status = 'unknown';
    const statusText = $('.story-info .info-status, .status').text().toLowerCase();
    if (statusText.includes('ongoing')) status = 'ongoing';
    else if (statusText.includes('complete')) status = 'completed';
    else if (statusText.includes('hiatus')) status = 'hiatus';

    // Genres
    const genres: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $('.story-info .info-genre a, .genres a, .tags a').each((_: any, el: any) => {
      const genre = $(el).text().trim();
      if (genre) genres.push(genre);
    });

    // Thumbnail
    let thumbnail = '';
    const thumbSelectors = ['.thumb img', '.cover img', '.entry-thumb img', '.manga-cover img'];
    for (const selector of thumbSelectors) {
      thumbnail = $(selector).attr('src') || $(selector).attr('data-src') || '';
      if (thumbnail) break;
    }

    return {
      title: title || 'Unknown',
      description: description || '',
      author: author || undefined,
      artist: artist || undefined,
      status,
      genres,
      thumbnail: this.resolveUrl(thumbnail),
    };
  }

  /**
   * Override chapter list parser for AsuraScans
   */
  protected async fetchChapterList(mangaUrl: string) {
    const $ = await this.fetch(mangaUrl);
    
    const chapters: Array<{
      url: string;
      name: string;
      date: number;
      number: number;
    }> = [];

    // Try multiple chapter list selectors
    const chapterSelectors = [
      '.chapter-list li a',
      '.chapters-list .chapter a',
      '.episode-list li a',
      '.mainchapter a',
      '.versions-chapters a',
    ];

    let foundChapters = false;
    for (const selector of chapterSelectors) {
      const $chapters = $(selector);
      if ($chapters.length > 0) {
        foundChapters = true;
        $chapters.each((_: any, el: any) => {
          const $el = $(el);
          const url = $el.attr('href') || '';
          const name = $el.text().trim() || 'Chapter';
          
          // Try to get date
          let date = 0;
          const $parent = $el.parent();
          const $dateEl = $parent.find('.chapter-date, .date, span');
          if ($dateEl.length) {
            const dateText = $dateEl.text().trim();
            date = this.parseDate(dateText);
          }

          // Extract chapter number
          const match = name.match(/ch(?:apter)?\.?\s*(\d+)/i) || name.match(/(\d+)/);
          const number = match ? parseInt(match[1]) : chapters.length + 1;

          if (url) {
            chapters.push({
              url: this.normalizeUrl(url),
              name,
              date,
              number,
            });
          }
        });
        break;
      }
    }

    // If no structured chapters found, try generic approach
    if (!foundChapters) {
      $('a[href*="/chapter"]').each((_: any, el: any) => {
        const $el = $(el);
        const url = $el.attr('href') || '';
        const name = $el.text().trim() || 'Chapter';
        
        if (url && url.includes('/chapter') && !chapters.some(c => c.url === url)) {
          const match = name.match(/ch(?:apter)?\.?\s*(\d+)/i) || name.match(/(\d+)/);
          const number = match ? parseInt(match[1]) : chapters.length + 1;
          
          chapters.push({
            url: this.normalizeUrl(url),
            name,
            date: 0,
            number,
          });
        }
      });
    }

    return chapters.reverse(); // Newest first
  }
}

export default AsuraScansParser;

