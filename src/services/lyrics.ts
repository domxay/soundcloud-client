import { LyricsData, LyricLine } from '@/types';

export class LyricsService {
  private static instance: LyricsService;
  private cache: Map<string, LyricsData | null> = new Map();

  private constructor() {}

  public static getInstance(): LyricsService {
    if (!LyricsService.instance) {
      LyricsService.instance = new LyricsService();
    }
    return LyricsService.instance;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/ft\..*|feat\..*/i, '')
      .replace(/official\s*(music\s*video|audio|video)/gi, '')
      .replace(/prod\..*/i, '')
      .trim();
  }

  private parseLrc(lrcText: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const rawLines = lrcText.split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

    for (const raw of rawLines) {
      const match = raw.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
        const text = raw.replace(timeRegex, '').trim();
        if (text) {
          lines.push({ time: totalSeconds, text });
        }
      }
    }

    lines.sort((a, b) => a.time - b.time);
    return lines;
  }

  public async fetchLyrics(trackTitle: string, artistName: string): Promise<LyricsData | null> {
    const key = `${artistName} - ${trackTitle}`.toLowerCase();
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    const cleaned = this.cleanTitle(trackTitle);
    const query = `${artistName} ${cleaned}`.trim();

    try {
      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SoundCloudDesktop/1.0 (contact: https://t.me/codesand)',
        },
      });

      if (!res.ok) {
        this.cache.set(key, null);
        return null;
      }

      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) {
        this.cache.set(key, null);
        return null;
      }

      const hit = list.find((item) => item.syncedLyrics) || list[0];

      if (hit.syncedLyrics) {
        const lines = this.parseLrc(hit.syncedLyrics);
        const result: LyricsData = {
          synced: true,
          lines,
          plainText: hit.plainLyrics || undefined,
        };
        this.cache.set(key, result);
        return result;
      } else if (hit.plainLyrics) {
        const lines: LyricLine[] = hit.plainLyrics
          .split('\n')
          .filter((l: string) => l.trim())
          .map((text: string, idx: number) => ({ time: idx * 5, text: text.trim() }));
        const result: LyricsData = {
          synced: false,
          lines,
          plainText: hit.plainLyrics,
        };
        this.cache.set(key, result);
        return result;
      }

      this.cache.set(key, null);
      return null;
    } catch {
      this.cache.set(key, null);
      return null;
    }
  }
}

export const lyricsService = LyricsService.getInstance();
