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

/**
 * Enhanced Manganato scraper with robust selectors
 */
export async function scrapeManganato(): Promise<ScrapedManga[]> {
  const mangaList: ScrapedManga[] = [];
  
  try {
    console.log('Manganato: Fetching main page...');
    const response = await axios.get('https://manganato.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    // Manganato selector patterns - updated for current site structure
    const selectorPatterns = [
      // Home page book items
      '.panel-home-book-item',
      '.home-page-book-item',
      // Story items (main content)
      '.story-item',
      '.story-item-home',
      // Update items
      '.update-item',
      '.home-update-item',
      // Popular items
      '.popular-manga-item',
      '.home-popular-item',
      // Search results
      '.search-results .result-item',
      '.story_find .item',
      // Grid items
      '.book-item',
      '.manga-item',
      // GENRES section
      '.genres-item',
      // Div with img inside anchor
      'div[itemtype*="Book"] a[href*="/manga-ninja/"]',
      'div[itemtype*="Manga"] a[href*="/manga-ninja/"]',
      // Direct anchor with img pattern
      'a[href*="/manga-ninja/"]:has(img)',
      // Generic card pattern
      '.card-manga',
      '.item-manga',
      // Content area patterns
      '.container .item',
      '.content .item',
      // NEW: Main content selectors
      '.main-content .story-item',
      '#main-content .story-item',
    ];

    let foundCount = 0;
    
    for (const selector of selectorPatterns) {
      if (foundCount > 0) break;
      
      const $elements = $(selector);
      console.log(`Manganato: Trying selector "${selector}" - found ${$elements.length} elements`);
      
      if ($elements.length > 0) {
        $elements.each((_, element) => {
          if (mangaList.length >= 50) return;
          
          const $el = $(element);
          const $anchor = $el.is('a') ? $el : $el.find('a').first();
          const $img = $el.is('img') ? $el : $el.find('img').first();
          
          // Get URL - Manganato changed to /manga-ninja/ or /manga/
          let url = $anchor.attr('href') || '';
          if (!url || (!url.includes('/manga-ninja/') && !url.includes('/manga/'))) return;
          
          // Get title - try multiple sources
          let title = '';
          if ($img.length > 0) {
            title = $img.attr('title') || $img.attr('alt') || '';
          }
          title = title || $anchor.attr('title') || $anchor.text().trim() || '';
          title = title.replace(/\n/g, ' ').trim();
          
          if (!title || title.length < 2) return;
          
          // Get cover image - handle lazy loading
          let coverUrl = '';
          if ($img.length > 0) {
            coverUrl = $img.attr('src') || 
                       $img.attr('data-src') || 
                       $img.attr('data-lazy-src') ||
                       $img.attr('data-original') ||
                       $img.attr('data-cfsrc') || '';
          }
          
          // Extract ID from URL
          const urlParts = url.split('/').filter(Boolean);
          const id = urlParts[urlParts.length - 1] || '';
          
          // Make URLs absolute
          url = url.startsWith('http') ? url : `https://manganato.com${url}`;
          
          if (coverUrl && !coverUrl.startsWith('http')) {
            coverUrl = coverUrl.startsWith('//') ? `https:${coverUrl}` : `https://manganato.com${coverUrl}`;
          }
          
          // Check for duplicates
          if (mangaList.some(m => m.id === id || m.title === title)) return;
          
          mangaList.push({
            id,
            title,
            coverUrl: coverUrl || '',
            url,
          });
          foundCount++;
        });
      }
    }

    // If no structured results, try a more generic approach
    if (mangaList.length === 0) {
      console.log('Manganato: Trying generic anchor extraction...');
      
      $('a[href*="/manga-ninja/"], a[href*="/manga/"]').each((_, el) => {
        if (mangaList.length >= 50) return;
        
        const $el = $(el);
        const $img = $el.find('img').first();
        const url = $el.attr('href') || '';
        
        if (!url || (!url.includes('/manga-ninja/') && !url.includes('/manga/'))) return;
        
        let title = $el.attr('title') || 
                    $img.attr('alt') || 
                    $el.text().trim() || 
                    '';
        title = title.replace(/\n/g, ' ').trim();
        
        if (!title || title.length < 2) return;
        
        const urlParts = url.split('/').filter(Boolean);
        const id = urlParts[urlParts.length - 1] || '';
        
        let coverUrl = '';
        if ($img.length > 0) {
          coverUrl = $img.attr('src') || 
                     $img.attr('data-src') || 
                     $img.attr('data-lazy-src') || '';
        }
        
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = coverUrl.startsWith('//') ? `https:${coverUrl}` : `https://manganato.com${coverUrl}`;
        }
        
        if (!mangaList.some(m => m.id === id || m.title === title)) {
          mangaList.push({
            id,
            title,
            coverUrl: coverUrl || '',
            url: url.startsWith('http') ? url : `https://manganato.com${url}`,
          });
        }
      });
    }

    console.log(`Manganato: Final result - ${mangaList.length} manga scraped`);
    return mangaList.slice(0, 50);
    
  } catch (error) {
    console.error('Manganato: Error during scraping:', error);
    return [];
  }
}

