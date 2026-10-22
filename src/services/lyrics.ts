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
      .replace(/(?:feat\.|ft\.|featuring).*$/i, '')
      .replace(/(?:prod\.|produced\s*by).*$/i, '')
      .replace(/official\s*(?:music\s*video|audio|video|visualizer|lyric\s*video)/gi, '')
      .replace(/(?:slowed\s*(?:\+|\&)?\s*reverb|hardtekk|sped\s*up|bass\s*boosted|remix|edit)/gi, '')
      .replace(/[-–—_]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  public cleanArtist(artist: string): string {
    return artist
      .replace(/@\w+/g, '')
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/[-–—_]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public resolveCandidatePairs(
    rawTitle: string,
    rawArtist: string
  ): { artist: string; title: string }[] {
    const pairs: { artist: string; title: string }[] = [];

    // Pattern 1: Title contains "Artist - Title" or "Artist – Title"
    const separatorMatch = rawTitle.match(/^([^-–—]+)\s*[-–—]\s*(.+)$/);
    if (separatorMatch) {
      const art = this.cleanArtist(separatorMatch[1]);
      const tit = this.cleanTitle(separatorMatch[2]);
      if (art && tit) {
        pairs.push({ artist: art, title: tit });
      }
    }

    // Pattern 2: Standard uploader name + cleaned title
    const stdArt = this.cleanArtist(rawArtist);
    const stdTit = this.cleanTitle(rawTitle);
    if (stdArt && stdTit) {
      pairs.push({ artist: stdArt, title: stdTit });
    }

    // Pattern 3: Cleaned title alone (for search fallback)
    if (stdTit) {
      pairs.push({ artist: '', title: stdTit });
    }

    return pairs;
  }

  private parseLrc(lrcText: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const rawLines = lrcText.split('\n');
    let offsetSeconds = 0;

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

  private isSearchCandidateValid(
    candidate: any,
    targetTitle: string,
    targetArtist: string,
    targetDuration?: number
  ): boolean {
    if (!candidate || candidate.instrumental) return false;
    if (!candidate.syncedLyrics && !candidate.plainLyrics) return false;

    const cTrack = this.normalize(candidate.trackName || candidate.name || '');
    const cArtist = this.normalize(candidate.artistName || '');
    const tTitle = this.normalize(targetTitle);
    const tArtist = this.normalize(targetArtist);

    if (!cTrack || !tTitle) return false;

    // Title match: one must contain the other, or major token overlap
    const titleMatch = cTrack.includes(tTitle) || tTitle.includes(cTrack);
    const titleTokensT = tTitle.split(' ').filter((w) => w.length > 2);
    const tokenOverlap = titleTokensT.some((token) => cTrack.includes(token));

    if (!titleMatch && !tokenOverlap) {
      return false;
    }

    // If candidate has artist and target has artist, verify artist overlap
    if (tArtist && cArtist) {
      const artistMatch = cArtist.includes(tArtist) || tArtist.includes(cArtist);
      const artistTokens = tArtist.split(' ').filter((w) => w.length > 2);
      const artOverlap = artistTokens.some((tok) => cArtist.includes(tok));
      if (!artistMatch && !artOverlap && !titleMatch) {
        return false;
      }
    }

    // Duration check: if target track has duration > 30s, reject candidates with drastic drift (> 18s)
    if (targetDuration && targetDuration > 30 && candidate.duration) {
      const diff = Math.abs(candidate.duration - targetDuration);
      if (diff > 18) {
        return false;
      }
    }

    return true;
  }

  private extractLyricsFromDescription(desc?: string, durationSeconds?: number): LyricsData | null {
    if (!desc || typeof desc !== 'string') return null;
    const cleanDesc = desc.trim();
    if (cleanDesc.length < 30) return null;

    // Strict regex: require explicit indicator of lyrics block
    const lyricsMatch = cleanDesc.match(
      /(?:lyrics|текст\s*(?:песни)?|songtext|слова\s*песни)\s*[:\-]\s*\n*([\s\S]+)/i
    );
    if (!lyricsMatch || !lyricsMatch[1]) {
      return null;
    }

    const content = lyricsMatch[1];
    const rawLines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false;
        if (/^(https?:\/\/|instagram|telegram|t\.me|vk\.com|follow|stream|prod|beat\s*by|mixed\s*by|soundcloud)/i.test(l)) {
          return false;
        }
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

    const cacheKey = `${artistName} - ${trackTitle}`.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    const candidatePairs = this.resolveCandidatePairs(trackTitle, artistName);

    // 1. Try LRCLIB exact get with candidate pairs
    for (const pair of candidatePairs) {
      if (!pair.title) continue;
      try {
        let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(pair.title)}`;
        if (pair.artist) {
          getUrl += `&artist_name=${encodeURIComponent(pair.artist)}`;
        }
        if (durationSeconds && durationSeconds > 20) {
          getUrl += `&duration=${Math.round(durationSeconds)}`;
        }

        const res = await fetch(getUrl, {
          headers: { 'User-Agent': 'SoundCloudDesktop/1.0 (https://t.me/codesand)' },
        });

        if (res.ok) {
          const hit = await res.json();
          if (hit?.syncedLyrics) {
            const result: LyricsData = {
              synced: true,
              lines: this.parseLrc(hit.syncedLyrics),
              plainText: hit.plainLyrics || '',
            };
            this.cache.set(cacheKey, result);
            return result;
          } else if (hit?.plainLyrics) {
            const rawLines = hit.plainLyrics.split('\n').filter((l: string) => l.trim());
            const interval = durationSeconds ? durationSeconds / (rawLines.length || 1) : 4;
            const result: LyricsData = {
              synced: false,
              lines: rawLines.map((text: string, idx: number) => ({
                time: idx * interval,
                text: text.trim(),
              })),
              plainText: hit.plainLyrics,
            };
            this.cache.set(cacheKey, result);
            return result;
          }
        }
      } catch {}
    }

    // 2. Try LRCLIB search query with candidate pairs and strict candidate validation
    for (const pair of candidatePairs) {
      const query = pair.artist ? `${pair.artist} ${pair.title}` : pair.title;
      if (!query.trim()) continue;

      try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(searchUrl, {
          headers: { 'User-Agent': 'SoundCloudDesktop/1.0 (https://t.me/codesand)' },
        });

        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const validCandidates = list.filter((item) =>
              this.isSearchCandidateValid(item, pair.title, pair.artist, durationSeconds)
            );

            // Prioritize synced candidates
            const bestHit =
              validCandidates.find((item) => item.syncedLyrics) || validCandidates[0];

            if (bestHit) {
              if (bestHit.syncedLyrics) {
                const result: LyricsData = {
                  synced: true,
                  lines: this.parseLrc(bestHit.syncedLyrics),
                  plainText: bestHit.plainLyrics || '',
                };
                this.cache.set(cacheKey, result);
                return result;
              } else if (bestHit.plainLyrics) {
                const rawLines = bestHit.plainLyrics.split('\n').filter((l: string) => l.trim());
                const interval = durationSeconds ? durationSeconds / (rawLines.length || 1) : 4;
                const result: LyricsData = {
                  synced: false,
                  lines: rawLines.map((text: string, idx: number) => ({
                    time: idx * interval,
                    text: text.trim(),
                  })),
                  plainText: bestHit.plainLyrics,
                };
                this.cache.set(cacheKey, result);
                return result;
              }
            }
          }
        }
      } catch {}
    }

    // 3. Fallback to extracting lyrics from SoundCloud track description (strict only)
    if (trackDescription) {
      const descLyrics = this.extractLyricsFromDescription(trackDescription, durationSeconds);
      if (descLyrics) {
        this.cache.set(cacheKey, descLyrics);
        return descLyrics;
      }
    }

    // 4. Fallback to Open Lyrics OVH API with candidate pairs
    for (const pair of candidatePairs) {
      if (!pair.artist || !pair.title) continue;
      try {
        const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(pair.artist)}/${encodeURIComponent(pair.title)}`;
        const res = await fetch(ovhUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.lyrics && typeof data.lyrics === 'string') {
            const rawLines = data.lyrics.split('\n').filter((l: string) => l.trim());
            if (rawLines.length > 4) {
              const interval = durationSeconds ? durationSeconds / (rawLines.length || 1) : 4;
              const result: LyricsData = {
                synced: false,
                lines: rawLines.map((text: string, idx: number) => ({
                  time: idx * interval,
                  text: text.trim(),
                })),
                plainText: data.lyrics,
              };
              this.cache.set(cacheKey, result);
              return result;
            }
          }
        }
      } catch {}
    }

    this.cache.set(cacheKey, null);
    return null;
  }
}

export const lyricsService = LyricsService.getInstance();
