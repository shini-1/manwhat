/**
 * Manganato Parser - Mihon-inspired selector-based parsing
 * Based on Mihon's ParsedHttpSource pattern
 */

import { ParsedHttpSource, SourceSelectors, SourceConfig } from '../BaseSource';

// CSS Selectors for Manganato
const manganatoSelectors: SourceSelectors = {
  // Popular manga
  popularMangaSelector: '.panel-home-book-item, .home-page-book-item, .story-item, a[href*="/manga-ninja/"]:has(img)',
  popularMangaTitleAttr: 'title',
  popularMangaUrlAttr: 'href',
  popularMangaImgAttr: 'src',
  popularMangaNextPageSelector: '.pagination .next-page a, .page-nav a.next',

  // Search manga
  searchMangaSelector: '.search-results .result-item, .story_find .item, a[href*="/manga-ninja/"]:has(img)',
  searchMangaTitleAttr: 'title',
  searchMangaUrlAttr: 'href',
  searchMangaImgAttr: 'src',
  searchMangaNextPageSelector: '.pagination .next-page a',

  // Latest updates
  latestUpdatesSelector: '.update-item, .home-update-item, .story-item, a[href*="/manga-ninja/"]:has(img)',
  latestUpdatesTitleAttr: 'title',
  latestUpdatesUrlAttr: 'href',
  latestUpdatesImgAttr: 'src',
  latestUpdatesNextPageSelector: '.pagination .next-page a',

  // Manga details
  mangaDetailsTitleSelector: '.manga-info .manga-title, h1.title, .title-top h1',
  mangaDetailsAuthorSelector: '.manga-info .info-author, .author, .info-item:contains("Author")',
  mangaDetailsArtistSelector: '.manga-info .info-artist, .artist',
  mangaDetailsDescriptionSelector: '.manga-info .description, .story-content, .description-content',
  mangaDetailsStatusSelector: '.manga-info .info-status, .status, .info-item:contains("Status")',
  mangaDetailsGenreSelector: '.manga-info .info-genres a, .genres a, .kind a',
  mangaDetailsThumbnailSelector: '.manga-info .manga-cover-pic img, .cover img, .thumb img',

  // Chapter list
  chapterListSelector: '.chapter-list li, .chapter-list .chapter, .chapters li a, ul.chapters a',
  chapterNameSelector: '.chapter-name, a, .chaptername',
  chapterUrlAttr: 'href',
  chapterDateSelector: '.chapter-date, .date, .time',
  chapterNumberSelector: '.chapter-number, .chapternum',

  // Page list
  pageListSelector: '.container .page-img, .vuwChapter img, .page-break img, .images img',
  pageImgAttr: 'src',
  pageUrlAttr: 'src',
};

const manganatoConfig: SourceConfig = {
  id: 'manganato',
  name: 'Manganato',
  baseUrl: 'https://manganato.com',
  lang: 'en',
  selectors: manganatoSelectors,
};

export class ManganatoParser extends ParsedHttpSource {
  constructor() {
    super(manganatoConfig);
  }

  protected getPopularMangaUrl(page: number): string {
    return page > 1 ? `/genre/${page}` : '/';
  }

  protected getSearchMangaUrl(query: string, page: number): string {
    return `/search/${encodeURIComponent(query)}${page > 1 ? `?page=${page}` : ''}`;
  }

  protected getLatestUpdatesUrl(page: number): string {
    return page > 1 ? `/genre/${page}` : '/';
  }

  /**
   * Override manga details parser for Manganato-specific HTML
   */
  protected async fetchMangaDetails(mangaUrl: string) {
    const $ = await this.fetch(mangaUrl);
    
    // Title
    let title = '';
    const titleSelectors = ['.manga-info .manga-title', 'h1.title', '.title-top h1'];
    for (const selector of titleSelectors) {
      title = $(selector).text().trim();
      if (title) break;
    }

    // Description
    let description = '';
    const descSelectors = ['.manga-info .description', '.story-content', '.description-content'];
    for (const selector of descSelectors) {
      description = $(selector).text().trim();
      if (description) break;
    }

    // Author/Artist
    let author = '';
    let artist = '';
    $('.manga-info .info-item, .info').each((_: number, el: any) => {
      const text = $(el).text().toLowerCase();
      if (text.includes('author')) {
        author = $(el).text().replace(/author/i, '').trim();
      }
      if (text.includes('artist')) {
        artist = $(el).text().replace(/artist/i, '').trim();
      }
    });

    // Status
    let status = 'unknown';
    const statusText = $('.manga-info .info-status, .status').text().toLowerCase();
    if (statusText.includes('ongoing')) status = 'ongoing';
    else if (statusText.includes('complete')) status = 'completed';

    // Genres
    const genres: string[] = [];
    $('.manga-info .info-genres a, .genres a').each((_: number, el: any) => {
      const genre = $(el).text().trim();
      if (genre) genres.push(genre);
    });

    // Thumbnail
    let thumbnail = '';
    const thumbSelectors = ['.manga-info .manga-cover-pic img', '.cover img', '.thumb img'];
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
   * Override chapter list parser for Manganato
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
      '.chapters li a',
      'ul.chapters a',
      '.chapter-list .chapter a',
    ];

    let foundChapters = false;
    for (const selector of chapterSelectors) {
      const $chapters = $(selector);
      if ($chapters.length > 0) {
        foundChapters = true;
        $chapters.each((_: number, el: any) => {
          const $el = $(el);
          const url = $el.attr('href') || '';
          const name = $el.text().trim() || 'Chapter';
          
          // Get date from parent
          let date = 0;
          const $parent = $el.parent();
          const $dateEl = $parent.find('.chapter-date, .date, .time');
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

    return chapters.reverse(); // Newest first
  }
}

export default ManganatoParser;

