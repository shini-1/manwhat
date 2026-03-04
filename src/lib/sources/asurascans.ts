import axios from 'axios';
import * as cheerio from 'cheerio';
import { SourceScraper, ScraperResult } from './index';

class AsuraScansScraper implements SourceScraper {
  name = 'Asura Scans';
  baseUrl = 'https://asurascans.com';

  async getPopularManga(): Promise<ScraperResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const results: ScraperResult[] = [];

      // Asura Scans popular manga selector - adjust based on site structure
      $('.pop-slider .swiper-slide, .popular-manga .item, .manga-list .manga-item').each((_, element) => {
        const $el = $(element);
        const titleEl = $el.find('a').first();
        const title = titleEl.attr('title') || titleEl.text()?.trim() || '';
        const url = titleEl.attr('href') || '';

        if (title && url) {
          // Extract manga ID from URL
          const id = url.replace(/.*\/manga\//, '').replace(/\//, '');
          
          // Try to get cover image
          const coverEl = $el.find('img').first();
          const coverUrl = coverEl.attr('src') || coverEl.attr('data-src') || '';

          results.push({
            id,
            title,
            coverUrl: coverUrl.startsWith('http') ? coverUrl : `${this.baseUrl}${coverUrl}`,
            url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
          });
        }
      });

      // Fallback: If no results from primary selector, try alternative selectors
      if (results.length === 0) {
        $('div.bsx, div.manga-item, article.manga').each((_, element) => {
          const $el = $(element);
          const titleEl = $el.find('a').first();
          const title = titleEl.attr('title') || titleEl.text()?.trim() || '';
          const url = titleEl.attr('href') || '';
          
          if (title && url) {
            const id = url.replace(/.*\/manga\//, '').replace(/\//, '');
            const coverEl = $el.find('img').first();
            const coverUrl = coverEl.attr('src') || coverEl.attr('data-src') || '';

            results.push({
              id,
              title,
              coverUrl: coverUrl.startsWith('http') ? coverUrl : `${this.baseUrl}${coverUrl}`,
              url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
            });
          }
        });
      }

      return results.slice(0, 50);
    } catch (error) {
      console.error('Error fetching from Asura Scans:', error);
      return [];
    }
  }

  async searchManga(query: string): Promise<ScraperResult[]> {
    try {
      const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const results: ScraperResult[] = [];

      $('div.bsx, div.manga-item, article.manga, div.search-result-item').each((_, element) => {
        const $el = $(element);
        const titleEl = $el.find('a').first();
        const title = titleEl.attr('title') || titleEl.text()?.trim() || '';
        const url = titleEl.attr('href') || '';
        
        if (title && url) {
          const id = url.replace(/.*\/manga\//, '').replace(/\//, '');
          const coverEl = $el.find('img').first();
          const coverUrl = coverEl.attr('src') || coverEl.attr('data-src') || '';

          results.push({
            id,
            title,
            coverUrl: coverUrl.startsWith('http') ? coverUrl : `${this.baseUrl}${coverUrl}`,
            url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
          });
        }
      });

      return results.slice(0, 20);
    } catch (error) {
      console.error('Error searching Asura Scans:', error);
      return [];
    }
  }

  async getMangaDetails(id: string): Promise<ScraperResult> {
    try {
      const url = `${this.baseUrl}/manga/${id}/`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      
      const title = $('.entry-title, h1, .manga-title').text()?.trim() || '';
      const description = $('.synopsis, .description, .entry-content').text()?.trim() || '';
      const coverUrl = $('.thumb img, .cover-image img').attr('src') || '';
      
      // Try to extract status and other info
      const status = $('.status, .manga-status').text()?.trim() || '';
      const author = $('.author, .manga-author').text()?.trim() || '';

      // Extract genres
      const genres: string[] = [];
      $('.genre a, .tags a, .manga-genres a').each((_, el) => {
        const genre = $(el).text()?.trim();
        if (genre) genres.push(genre);
      });

      // Extract chapter count
      const chapters = $('#chapterlist .chapter, .chapter-list .chapter').length;

      return {
        id,
        title,
        coverUrl: coverUrl.startsWith('http') ? coverUrl : `${this.baseUrl}${coverUrl}`,
        description,
        status,
        author,
        genres,
        chapters,
        url,
      };
    } catch (error) {
      console.error('Error fetching manga details from Asura Scans:', error);
      throw error;
    }
  }
}

export default new AsuraScansScraper();
