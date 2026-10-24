export interface PinterestWallpaperItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  width?: number;
  height?: number;
  source?: string;
  type: 'image' | 'video';
}

export const AESTHETIC_SEARCH_TAGS = [
  'Dark Aesthetic',
  'Cyberpunk Neon 4K',
  'Anime Lo-Fi Night',
  'Moody Rain City',
  'Gothic Minimal',
  'Synthwave Drive',
  'Vaporwave Sunset',
  'Pixel Art Rain',
  'Obsidian OLED',
  'Tokyo Street Rain',
  'Studio Ghibli Sky',
  'Cosmic Nebula 4K',
];

export class PinterestService {
  private static instance: PinterestService;

  public static getInstance(): PinterestService {
    if (!PinterestService.instance) {
      PinterestService.instance = new PinterestService();
    }
    return PinterestService.instance;
  }

  /**
   * Search real Pinterest aesthetic images via DuckDuckGo Pinterest index
   */
  public async search(query: string, animated: boolean = false): Promise<PinterestWallpaperItem[]> {
    const cleanQuery = query.trim() || 'dark aesthetic';
    
    // If running in Electron and IPC is available, use native IPC
    if (window.electronAPI?.searchPinterest) {
      try {
        const results = await window.electronAPI.searchPinterest(cleanQuery, animated);
        if (results && results.length > 0) return results;
      } catch (err) {
        console.warn('Native Pinterest search failed, trying direct fetch:', err);
      }
    }

    // Direct fetch fallback (works in Electron due to webSecurity: false)
    try {
      const fullQuery = `site:pinterest.com ${cleanQuery} ${animated ? 'aesthetic gif loop' : 'aesthetic wallpaper 4k'}`;
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(fullQuery)}&iax=images&ia=images`;

      const tokenRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const html = await tokenRes.text();
      const match = html.match(/vqd=([0-9-]+)/);
      if (!match) return [];

      const vqd = match[1];
      const filterParam = animated ? '&f=type:gif' : '';
      const apiReq = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(fullQuery)}&vqd=${vqd}${filterParam}`;

      const res = await fetch(apiReq, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const data = await res.json();
      const items: any[] = data.results || [];

      return items
        .filter((item) => item.image && (item.image.includes('pinimg.com') || item.image.startsWith('http')))
        .map((item, index) => {
          const isGif = item.image.toLowerCase().endsWith('.gif') || animated;
          const isVideo = item.image.toLowerCase().endsWith('.mp4') || item.image.toLowerCase().endsWith('.webm');
          const type: 'image' | 'video' = isVideo ? 'video' : 'image';

          return {
            id: `pin-${Date.now()}-${index}`,
            title: item.title?.replace(/\|.*|Etsy.*|-.*|Pinterest/gi, '').trim() || 'Pinterest Aesthetic',
            url: item.image,
            thumbnail: item.thumbnail || item.image,
            width: item.width,
            height: item.height,
            source: item.url,
            type,
          };
        });
    } catch (error) {
      console.error('Failed to search Pinterest:', error);
      return [];
    }
  }

  /**
   * Resolves direct Pinterest URL (e.g. https://pin.it/... or https://pinterest.com/pin/...)
   * to full-resolution uncompressed image or video asset
   */
  public async resolveUrl(url: string): Promise<{ success: boolean; url?: string; type?: 'image' | 'video'; error?: string }> {
    const trimmed = url.trim();
    if (!trimmed) return { success: false, error: 'Empty URL' };

    // If it's already a direct raw image/video URL
    if (/\.(jpg|jpeg|png|webp|gif|mp4|webm)(\?.*)?$/i.test(trimmed)) {
      const isVideo = /\.(mp4|webm)(\?.*)?$/i.test(trimmed);
      return { success: true, url: trimmed, type: isVideo ? 'video' : 'image' };
    }

    if (window.electronAPI?.resolvePinterestUrl) {
      try {
        const result = await window.electronAPI.resolvePinterestUrl(trimmed);
        if (result && result.success) return result;
      } catch (err) {
        console.warn('Native Pinterest URL resolve failed, trying direct fetch:', err);
      }
    }

    try {
      const res = await fetch(trimmed, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
      });
      const html = await res.text();

      // Priority 1: Original full-res Pinterest pinimg
      const origMatch = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9\/._-]+/);
      if (origMatch) {
        const imgUrl = origMatch[0];
        const isGif = imgUrl.toLowerCase().endsWith('.gif');
        return { success: true, url: imgUrl, type: 'image' };
      }

      // Priority 2: Pinterest Video (mp4)
      const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/) ||
        html.match(/https:\/\/v\.pinimg\.com\/videos\/[a-zA-Z0-9\/._-]+\.mp4/);
      if (videoMatch) {
        return { success: true, url: videoMatch[1] || videoMatch[0], type: 'video' };
      }

      // Priority 3: 736x or 1200x high-res
      const highResMatch = html.match(/https:\/\/i\.pinimg\.com\/(?:736x|1200x)\/[a-zA-Z0-9\/._-]+/);
      if (highResMatch) {
        return { success: true, url: highResMatch[0], type: 'image' };
      }

      // Priority 4: Standard og:image
      const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogMatch) {
        return { success: true, url: ogMatch[1], type: 'image' };
      }

      return { success: false, error: 'Could not extract image from Pinterest link' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch Pinterest link' };
    }
  }
}

export const pinterestService = PinterestService.getInstance();
