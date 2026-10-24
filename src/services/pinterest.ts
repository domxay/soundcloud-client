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
      const fullQuery = animated
        ? `site:pinterest.com ${cleanQuery} gif loop`
        : `site:pinterest.com ${cleanQuery} wallpaper 4k`;
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(fullQuery)}&iax=images&ia=images`;

      const tokenRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      const html = await tokenRes.text();
      const match = html.match(/vqd=["']?([0-9-]+)["']?/i) || html.match(/vqd=([0-9-]+)/i);
      if (!match) return [];

      const vqd = match[1];
      const filterParam = animated ? '&f=type:gif' : '';
      const apiReq = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(fullQuery)}&vqd=${vqd}${filterParam}`;

      const res = await fetch(apiReq, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      const data = await res.json();
      const items: any[] = data.results || [];

      return items
        .filter((item) => item.image && item.image.startsWith('http') && !item.image.includes('d53b014d86a6b6761bf649a0ed813c2b'))
        .map((item, index) => {
          let fullUrl = item.image;
          if (fullUrl.includes('pinimg.com')) {
            fullUrl = fullUrl.replace(/\/(?:236x|474x|564x|736x|1200x)\//, '/originals/');
          }

          let thumbUrl = item.thumbnail || item.image;
          if (thumbUrl.includes('pinimg.com/originals/')) {
            thumbUrl = thumbUrl.replace('/originals/', '/474x/');
          }

          const isVideo = /\.(mp4|webm)$/i.test(fullUrl);

          return {
            id: `pin-${Date.now()}-${index}`,
            title: item.title?.replace(/\|.*|Etsy.*|-.*|Pinterest/gi, '').trim() || 'Pinterest Aesthetic',
            url: fullUrl,
            thumbnail: thumbUrl,
            width: item.width,
            height: item.height,
            source: item.url,
            type: isVideo ? 'video' : 'image',
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
      const origUrl = trimmed.replace(/\/(?:236x|474x|564x|736x|1200x)\//, '/originals/');
      const isVideo = /\.(mp4|webm)(\?.*)?$/i.test(origUrl);
      return { success: true, url: origUrl, type: isVideo ? 'video' : 'image' };
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });
      const html = await res.text();

      // Priority 1: Video (MP4) from v1.pinimg.com or og:video
      const mp4Matches = [...html.matchAll(/https:\/\/(?:v1\.pinimg\.com|v\.pinimg\.com)[^"'<>\s]+\.mp4/g)].map((m) => m[0]);
      if (mp4Matches.length > 0) {
        const bestVideo = mp4Matches.find((v) => v.includes('720p') || v.includes('1080p')) || mp4Matches[0];
        return { success: true, url: bestVideo, type: 'video' };
      }

      const ogVideo = html.match(/<meta property="og:video" content="([^"]+)"/);
      if (ogVideo) {
        return { success: true, url: ogVideo[1], type: 'video' };
      }

      // Priority 2: Original full-res Pinterest pinimg (exclude site logo d53b014d86a6b6761bf649a0ed813c2b)
      const allOriginals = [...html.matchAll(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9\/._-]+\.(?:jpg|png|webp|gif)/g)]
        .map((m) => m[0])
        .filter((u) => !u.includes('d53b014d86a6b6761bf649a0ed813c2b'));

      if (allOriginals.length > 0) {
        return { success: true, url: allOriginals[0], type: 'image' };
      }

      // Priority 3: 736x or other sizes upgraded to originals
      const resMatches = [...html.matchAll(/https:\/\/i\.pinimg\.com\/(?:736x|1200x|564x|474x)\/[a-zA-Z0-9\/._-]+\.(?:jpg|png|webp|gif)/g)]
        .map((m) => m[0])
        .filter((u) => !u.includes('d53b014d86a6b6761bf649a0ed813c2b'));

      if (resMatches.length > 0) {
        const upgraded = resMatches[0].replace(/\/(?:736x|1200x|564x|474x)\//, '/originals/');
        return { success: true, url: upgraded, type: 'image' };
      }

      // Priority 4: og:image upgraded
      const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogMatch && !ogMatch[1].includes('d53b014d86a6b6761bf649a0ed813c2b')) {
        const upgraded = ogMatch[1].replace(/\/(?:736x|1200x|564x|474x)\//, '/originals/');
        return { success: true, url: upgraded, type: 'image' };
      }

      return { success: false, error: 'Не удалось извлечь оригинальный медиафайл из ссылки Pinterest' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Resolve failed' };
    }
  }
}

export const pinterestService = PinterestService.getInstance();
