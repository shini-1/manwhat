import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedManga {
  id: string;
  title: string;
  coverUrl?: string;
  url: string;
  status?: string;
  genres?: string[];
  description?: string;
}

export async function scrapeManganato(): Promise<ScrapedManga[]> {
  try {
    // Try the main home page first
    const response = await axios.get('https://manganato.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const mangaList: ScrapedManga[] = [];

    // Manganato uses different selectors - try multiple patterns
    const selectors = [
      // Main content area selectors
      '.panel-home-book-item',
      '.story-item',
      '.update-item',
      '.popular-manga-item',
      '.home-wrapper .story-item',
      // Alternative patterns
      'div.book-item',
      'div.story-item',
      '.items .item',
      // Search results pattern
      '.search-results .result',
      '.story_find .item',
      // Generic patterns
      'a[href*="/manga/"]',
    ];

    for (const selector of selectors) {
      if (mangaList.length > 0) break;
      
      $(selector).each((_, element) => {
        const $element = $(element);
        
        // Try to find title - look in multiple places
        let title = '';
        
        // For anchor tags, try different approaches
        if ($element.is('a')) {
          title = $element.attr('title') || 
                  $element.text().trim() || 
                  $element.find('img').attr('alt') || '';
        } else {
          title = $element.find('.story-title, .title, h3, h4, a').text().trim() ||
                  $element.attr('title') ||
                  $element.find('img').attr('alt') ||
                  '';
        }
        
        // Get URL from anchor tag
        let url = $element.find('a').attr('href') || $element.attr('href') || '';
        
        // Get cover image
        let coverUrl = $element.find('img').attr('src') || 
                       $element.find('img').attr('data-src') ||
                       $element.find('img').attr('data-lazy-src') || '';

        // Clean up title
        title = title.replace(/\n/g, ' ').trim();
        
        // Skip if no valid data
        if (!title || title.length < 2) return;
        
        // For generic anchor selector, filter to only manga URLs
        if (selector === 'a[href*="/manga/"]' && !url.includes('/manga/')) return;
        
        if (!url || !url.includes('/manga/')) return;
        
        // Create a unique ID from the URL
        const urlParts = url.split('/').filter(Boolean);
        const id = urlParts[urlParts.length - 1] || Math.random().toString(36).substring(7);
        
        // Make sure URL is absolute
        url = url.startsWith('http') ? url : `https://manganato.com${url}`;
        
        // Make sure cover URL is absolute
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = coverUrl.startsWith('//') ? `https:${coverUrl}` : `https://manganato.com${coverUrl}`;
        }

        // Avoid duplicates
        if (mangaList.some(m => m.id === id || m.title === title)) return;

        mangaList.push({
          id,
          title,
          coverUrl: coverUrl || '',
          url,
        });
      });
      
      if (mangaList.length > 0) {
        console.log(`Manganato: Found ${mangaList.length} manga using selector: ${selector}`);
        break;
      }
    }

    // If still no results, try a more aggressive approach
    if (mangaList.length === 0) {
      $('a[href*="/manga/"]').each((_, element) => {
        const $element = $(element);
        const url = $element.attr('href') || '';
        const title = $element.text().trim() || $element.attr('title') || '';
        
        if (url && title && title.length > 2) {
          const urlParts = url.split('/').filter(Boolean);
          const id = urlParts[urlParts.length - 1] || Math.random().toString(36).substring(7);
          
          if (!mangaList.some(m => m.id === id)) {
            mangaList.push({
              id,
              title: title.replace(/\n/g, ' ').trim(),
              url: url.startsWith('http') ? url : `https://manganato.com${url}`,
              coverUrl: '',
            });
          }
        }
      });
    }

    console.log(`Scraped ${mangaList.length} manga from Manganato`);
    return mangaList.slice(0, 50); // Limit to 50 results
  } catch (error) {
    console.error('Error scraping Manganato:', error);
    return [];
  }
}
