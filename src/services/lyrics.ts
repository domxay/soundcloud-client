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

  public cleanTitle(title: string): string {
    return title
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/ft\..*|feat\..*/i, '')
      .replace(/official\s*(music\s*video|audio|video|visualizer|lyric\s*video)/gi, '')
      .replace(/prod\..*/i, '')
      .replace(/slowed\s*(\+|\&)?\s*reverb/gi, '')
      .replace(/hardtekk|sped\s*up|bass\s*boosted|remix/gi, '')
      .replace(/[-–—_]/g, ' ')
      .trim();
  }

  public cleanArtist(artist: string): string {
    return artist
      .replace(/@\w+/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/[-–—_]/g, ' ')
      .trim();
  }

  private parseLrc(lrcText: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const rawLines = lrcText.split('\n');
    let offsetSeconds = 0;

    // Check for [offset: +/-ms] tag
    for (const raw of rawLines) {
      const offsetMatch = raw.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
      if (offsetMatch) {
        offsetSeconds = parseInt(offsetMatch[1], 10) / 1000;
        break;
      }
    }

    const timeGlobalRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const raw of rawLines) {
      const trimmed = raw.trim();
      if (!trimmed || /^\[(ti|ar|al|by|re|ve|length|offset):/i.test(trimmed)) continue;

      const timestamps: number[] = [];
      let match: RegExpExecArray | null;
      while ((match = timeGlobalRegex.exec(trimmed)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const total = minutes * 60 + seconds + milliseconds / 1000 + offsetSeconds;
        timestamps.push(Math.max(0, total));
      }

      const text = trimmed.replace(/\[.*?\]/g, '').trim();
      if (text && timestamps.length > 0) {
        for (const t of timestamps) {
          lines.push({ time: t, text });
        }
      }
    }

    lines.sort((a, b) => a.time - b.time);
    return lines;
  }

  private extractLyricsFromDescription(desc?: string, durationSeconds?: number): LyricsData | null {
    if (!desc || typeof desc !== 'string') return null;
    const cleanDesc = desc.trim();
    if (cleanDesc.length < 20) return null;

    // Check if there is an explicit "Lyrics:" or "Текст:" block
    const lyricsMatch = cleanDesc.match(/(?:lyrics|текст\s*(?:песни)?|songtext)\s*:\s*\n*([\s\S]+)/i);
    const content = lyricsMatch ? lyricsMatch[1] : cleanDesc;

    const rawLines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false;
        // Skip links, social handles, promo tags
        if (/^(https?:\/\/|instagram|telegram|t\.me|vk\.com|follow|stream|prod|beat\s*by|mixed\s*by)/i.test(l)) return false;
        return true;
      });

    if (rawLines.length < 4) return null;

    const duration = durationSeconds && durationSeconds > 10 ? durationSeconds : rawLines.length * 4;
    const interval = Math.max(2.5, duration / rawLines.length);

    const lines: LyricLine[] = rawLines.map((text, idx) => ({
      time: Math.round(idx * interval * 10) / 10,
      text,
    }));

    return {
      synced: false,
      lines,
      plainText: rawLines.join('\n'),
    };
  }

  public getUserLyrics(trackId: number): LyricsData | null {
    try {
      const saved = localStorage.getItem(`sc_user_lyrics_${trackId}`);
      if (saved) {
        const lines: LyricLine[] = saved
          .split('\n')
          .filter((l) => l.trim())
          .map((text, idx) => ({ time: idx * 4, text: text.trim() }));
        return {
          synced: false,
          lines,
          plainText: saved,
        };
      }
    } catch {}
    return null;
  }

  public saveUserLyrics(trackId: number, text: string): void {
    try {
      if (text.trim()) {
        localStorage.setItem(`sc_user_lyrics_${trackId}`, text.trim());
      } else {
        localStorage.removeItem(`sc_user_lyrics_${trackId}`);
      }
    } catch {}
  }

  public async fetchLyrics(
    trackTitle: string,
    artistName: string,
    trackId?: number,
    trackDescription?: string,
    durationSeconds?: number
  ): Promise<LyricsData | null> {
    if (trackId) {
      const userSaved = this.getUserLyrics(trackId);
      if (userSaved) return userSaved;
    }

    const key = `${artistName} - ${trackTitle}`.toLowerCase();
    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    const cleanedTitle = this.cleanTitle(trackTitle);
    const cleanedArtist = this.cleanArtist(artistName);

    // 1. Try LRCLIB exact get
    try {
      const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
      const res = await fetch(getUrl, {
        headers: { 'User-Agent': 'SoundCloudDesktop/1.0 (https://t.me/codesand)' },
      });
      if (res.ok) {
        const hit = await res.json();
        if (hit?.syncedLyrics) {
          const result: LyricsData = {
            synced: true,
            lines: this.parseLrc(hit.syncedLyrics),
            plainText: hit.plainLyrics,
          };
          this.cache.set(key, result);
          return result;
        } else if (hit?.plainLyrics) {
          const rawLines = hit.plainLyrics.split('\n').filter((l: string) => l.trim());
          const interval = durationSeconds ? durationSeconds / (rawLines.length || 1) : 4;
          const result: LyricsData = {
            synced: false,
            lines: rawLines.map((text: string, idx: number) => ({ time: idx * interval, text: text.trim() })),
            plainText: hit.plainLyrics,
          };
          this.cache.set(key, result);
          return result;
        }
      }
    } catch {}

    // 2. Try LRCLIB search query
    try {
      const queries = [
        `${cleanedArtist} ${cleanedTitle}`,
        cleanedTitle,
      ];
      for (const q of queries) {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q.trim())}`;
        const res = await fetch(searchUrl, {
          headers: { 'User-Agent': 'SoundCloudDesktop/1.0 (https://t.me/codesand)' },
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const hit = list.find((item: any) => item.syncedLyrics) || list[0];
            if (hit.syncedLyrics) {
              const result: LyricsData = {
                synced: true,
                lines: this.parseLrc(hit.syncedLyrics),
                plainText: hit.plainLyrics,
              };
              this.cache.set(key, result);
              return result;
            } else if (hit.plainLyrics) {
              const rawLines = hit.plainLyrics.split('\n').filter((l: string) => l.trim());
              const interval = durationSeconds ? durationSeconds / (rawLines.length || 1) : 4;
              const result: LyricsData = {
                synced: false,
                lines: rawLines.map((text: string, idx: number) => ({ time: idx * interval, text: text.trim() })),
                plainText: hit.plainLyrics,
              };
              this.cache.set(key, result);
              return result;
            }
          }
        }
      }
    } catch {}

    // 3. Fallback to extracting lyrics from SoundCloud track description
    if (trackDescription) {
      const descLyrics = this.extractLyricsFromDescription(trackDescription, durationSeconds);
      if (descLyrics) {
        this.cache.set(key, descLyrics);
        return descLyrics;
      }
    }

    // 4. Fallback to Open Lyrics OVH API
    try {
      const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`;
      const res = await fetch(ovhUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.lyrics && typeof data.lyrics === 'string') {
          const rawLines = data.lyrics.split('\n').filter((l: string) => l.trim());
          if (rawLines.length > 3) {
            const interval = durationSeconds ? durationSeconds / (rawLines.length || 1) : 4;
            const result: LyricsData = {
              synced: false,
              lines: rawLines.map((text: string, idx: number) => ({ time: idx * interval, text: text.trim() })),
              plainText: data.lyrics,
            };
            this.cache.set(key, result);
            return result;
          }
        }
      }
    } catch {}

    this.cache.set(key, null);
    return null;
  }
}

export const lyricsService = LyricsService.getInstance();
