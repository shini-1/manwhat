
import axios from 'axios';
import * as cheerio from 'cheerio';
import { SourceScraper, ScraperResult } from './index';

class MangakakalotScraper implements SourceScraper {
  name = 'Mangakakalot';
  baseUrl = 'https://mangakakalot.com';

  async getPopularManga(): Promise<ScraperResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      const $ = cheerio.load(response.data);
      const results: ScraperResult[] = [];

      const selectors = [
        '.panel-popular .item', 
        '.item-updated .item',
        '.home__allUpdated .item',
        '.section-update .item',
        'div.item',
        '.story-item',
        '.trending-item'
      ];

      for (const selector of selectors) {
        $(selector).each((_, element) => {
          const $el = $(element);
          const linkEl = $el.find('a').first();
          const title = linkEl.attr('title') || linkEl.text()?.trim() || '';
          const url = linkEl.attr('href') || '';
          
          if (title && url && url.includes('/manga/')) {
            const id = url.replace(/.*\/manga\//, '').replace(/\/$/, '');
            const imgEl = $el.find('img').first();
            const coverUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';
            
            const yearMatch = $el.text().match(/\b(19|20)\d{2}\b/);
            const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

            results.push({
              id,
              title,
              coverUrl: coverUrl.startsWith('http') ? coverUrl : `${this.baseUrl}${coverUrl}`,
              url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
              year,
            });
          }
        });
        
        if (results.length > 0) break;
      }

      console.log(`Mangakakalot: Found ${results.length} manga from popular page`);
      return results.slice(0, 50);
    } catch (error) {
      console.error('Error fetching from Mangakakalot:', error);
      return [];
    }
  }

  async searchManga(query: string): Promise<ScraperResult[]> {
    try {
      const searchUrl = `${this.baseUrl}/search/${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const results: ScraperResult[] = [];

      $('.story_item, .search-item, .item').each((_, element) => {
        const $el = $(element);
        const linkEl = $el.find('a').first();
        const title = linkEl.attr('title') || $el.find('.item-title').text()?.trim() || '';
        const url = linkEl.attr('href') || '';
        
        if (title && url && url.includes('/manga/')) {
          const id = url.replace(/.*\/manga\//, '').replace(/\/$/, '');
          const imgEl = $el.find('img').first();
          const coverUrl = imgEl.attr('src') || '';

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
      console.error('Error searching Mangakakalot:', error);
      return [];
    }
  }

  async getMangaDetails(id: string): Promise<ScraperResult> {
    try {
      const url = `${this.baseUrl}/manga/${id}`;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      
      const title = $('.item-title h1, .story-info-right h1, h1.title').text()?.trim() || '';
      const description = $('.item-description, .story-description, #panel-story-info-description').text()?.trim() || '';
      const coverUrl = $('.info-image img, .story-info-left img').attr('src') || '';
      
      const status = $('.status, .story-info-right .story-info-right-item').filter((_, el) => 
        $(el).text().toLowerCase().includes('status')
      ).text().replace(/status/i, '').trim() || '';
      
      const author = $('.author, .story-info-right .story-info-right-item').filter((_, el) => 
        $(el).text().toLowerCase().includes('author')
      ).text().replace(/author/i, '').trim() || '';

      const genres: string[] = [];
      $('.kind, .genres a, .story-info-right .story-info-right-item .element-list a').each((_, el) => {
        const genre = $(el).text()?.trim();
        if (genre) genres.push(genre);
      });

      const chapters = $('#chapter-list .chapter, .chapter-list .chapter-item, .row-content-chapter .chapter-item').length;

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
      console.error('Error fetching manga details from Mangakakalot:', error);
      throw error;
    }
  }
}

export default new MangakakalotScraper();

