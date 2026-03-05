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
 * Enhanced Asura Scans scraper with robust selectors
 */
export async function scrapeAsuraScans(): Promise<ScrapedManga[]> {
  const mangaList: ScrapedManga[] = [];
  
  try {
    // Try main home page
    console.log('AsuraScans: Fetching main page...');
    const response = await axios.get('https://asurascans.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    // Try multiple selector patterns for current Asura Scans structure
    const selectorPatterns = [
      // Main grid layout
      '.pop-grid .pop-item',
      '.bs .bsx',
      // List update layout
      '.list-update .update-item',
      '.episode-list .episode-item',
      // Search/Filter results
      '.search-results .result-item',
      '.manga-list .manga-item',
      // Generic card layout
      '.card-item',
      '.manga-card',
      // Popular section
      '.popular .item',
      '.trending .item',
      // Direct image + anchor pattern
      'div[itemtype*="Manga"] a[href*="/manga/"]',
      // Article/post pattern
      'article.post .post-thumb',
      //DIV with manga href pattern
      'div a[href*="/manga/"]:has(img)',
      // Literal new pattern - check all anchors with manga in URL and img sibling
      'a[href*="/manga/"]:not([href*="/chapter"]):has(img)',
    ];

    let foundCount = 0;
    
    for (const selector of selectorPatterns) {
      if (foundCount > 0) break;
      
      const $elements = $(selector);
      console.log(`AsuraScans: Trying selector "${selector}" - found ${$elements.length} elements`);
      
      if ($elements.length > 0) {
        $elements.each((_, element) => {
          if (mangaList.length >= 50) return;
          
          const $el = $(element);
          const $anchor = $el.is('a') ? $el : $el.find('a').first();
          const $img = $el.is('img') ? $el : $el.find('img').first();
          
          // Get URL
          let url = $anchor.attr('href') || '';
          if (!url || !url.includes('/manga/')) return;
          
          // Get title - try multiple sources
          let title = '';
          if ($img.length > 0) {
            title = $img.attr('alt') || $img.attr('title') || '';
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
          url = url.startsWith('http') ? url : `https://asurascans.com${url}`;
          
          if (coverUrl && !coverUrl.startsWith('http')) {
            coverUrl = coverUrl.startsWith('//') ? `https:${coverUrl}` : `https://asurascans.com${coverUrl}`;
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
      console.log('AsuraScans: Trying generic anchor extraction...');
      
      $('a[href*="/manga/"]:not([href*="/chapter"]):not([href*="/tag"])').each((_, el) => {
        if (mangaList.length >= 50) return;
        
        const $el = $(el);
        const $img = $el.find('img').first();
        const url = $el.attr('href') || '';
        
        let title = $el.attr('title') || 
                    $img.attr('alt') || 
                    $el.text().trim() || 
                    '';
        title = title.replace(/\n/g, ' ').trim();
        
        if (!title || title.length < 2 || !url.includes('/manga/')) return;
        
        const urlParts = url.split('/').filter(Boolean);
        const id = urlParts[urlParts.length - 1] || '';
        
        let coverUrl = '';
        if ($img.length > 0) {
          coverUrl = $img.attr('src') || 
                     $img.attr('data-src') || 
                     $img.attr('data-lazy-src') || '';
        }
        
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = coverUrl.startsWith('//') ? `https:${coverUrl}` : `https://asurascans.com${coverUrl}`;
        }
        
        if (!mangaList.some(m => m.id === id || m.title === title)) {
          mangaList.push({
            id,
            title,
            coverUrl: coverUrl || '',
            url: url.startsWith('http') ? url : `https://asurascans.com${url}`,
          });
        }
      });
    }

    console.log(`AsuraScans: Final result - ${mangaList.length} manga scraped`);
    return mangaList.slice(0, 50);
    
  } catch (error) {
    console.error('AsuraScans: Error during scraping:', error);
    // Return empty array - let fallback handle it
    return [];
  }
}

