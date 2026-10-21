import { Track, Playlist, UserProfile, Comment } from '@/types';
import { authService } from './auth';

const API_BASE = 'https://api-v2.soundcloud.com';
const LOCAL_LIKES_KEY = 'sc_local_likes';

export class SoundCloudApi {
  private static instance: SoundCloudApi;
  private trackRegistry: Map<number, Track> = new Map();
  private streamUrlCache: Map<number, { url: string; ts: number }> = new Map();
  private likeListeners: Set<(trackId: number, isLiked: boolean) => void> = new Set();
  private responseCache: Map<string, { data: any; expiresAt: number }> = new Map();

  private constructor() {}

  private getCachedData<T>(key: string): T | null {
    const item = this.responseCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.responseCache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private setCachedData<T>(key: string, data: T, ttlMs: number = 300000): void {
    this.responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  private async fetchWithRetry(url: string, init?: RequestInit, retries: number = 3): Promise<Response> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: { ...this.getHeaders(), ...(init?.headers || {}) },
        });
        clearTimeout(timeoutId);

        // Auto-refresh client ID if 401 Unauthorized occurs
        if (res.status === 401 && attempt === 0) {
          await authService.refreshClientId(true);
          const newUrl = new URL(url);
          newUrl.searchParams.set('client_id', authService.getClientId());
          return this.fetchWithRetry(newUrl.toString(), init, retries - 1);
        }

        if (res.ok || res.status === 404 || res.status === 401) {
          return res;
        }
      } catch (err: any) {
        if (attempt === retries - 1) throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    return fetch(url, { headers: this.getHeaders() });
  }

  private daysAgo(date?: string): number {
    if (!date) return 1;
    const ts = new Date(date).getTime();
    if (isNaN(ts)) return 1;
    const diff = Date.now() - ts;
    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    return days === 0 ? 0 : days;
  }

  public static getInstance(): SoundCloudApi {
    if (!SoundCloudApi.instance) {
      SoundCloudApi.instance = new SoundCloudApi();
    }
    return SoundCloudApi.instance;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };
    const token = authService.getOAuthToken();
    if (token) {
      headers['Authorization'] = `OAuth ${token}`;
    }
    return headers;
  }

  private buildUrl(path: string, params: Record<string, string | number> = {}): string {
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set('client_id', authService.getClientId());
    url.searchParams.set('app_version', '1792074084');
    url.searchParams.set('app_locale', 'en');
    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, String(val));
    }
    return url.toString();
  }

  public registerTrack(track: Track): void {
    this.trackRegistry.set(track.id, track);
  }

  public getTrack(id: number): Track | undefined {
    return this.trackRegistry.get(id);
  }

  public subscribeLikes(listener: (trackId: number, isLiked: boolean) => void): () => void {
    this.likeListeners.add(listener);
    return () => {
      this.likeListeners.delete(listener);
    };
  }

  private notifyLikes(trackId: number, isLiked: boolean): void {
    for (const listener of this.likeListeners) {
      try {
        listener(trackId, isLiked);
      } catch {}
    }
  }

  public async getCurrentUser(): Promise<UserProfile | null> {
    const token = authService.getOAuthToken();
    if (!token) return null;

    try {
      const res = await this.fetchWithRetry(this.buildUrl('/me'));
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id,
        username: data.username,
        avatar_url: data.avatar_url,
        city: data.city,
        country_code: data.country_code,
        followers_count: data.followers_count,
        followings_count: data.followings_count,
        track_count: data.track_count,
        playlist_count: data.playlist_count,
        permalink_url: data.permalink_url,
        description: data.description,
      };
    } catch {
      return null;
    }
  }

  // Filter and prioritize reliable transcodings (avoiding SoundCloud 404s like abr_sq)
  private prioritizeTranscodings(transcodings: any[]): any[] {
    if (!transcodings || !Array.isArray(transcodings)) return [];

    // Filter out abr_sq preset which is consistently 404 on SoundCloud
    const clean = transcodings.filter((t) => t.preset !== 'abr_sq');

    const progressive = clean.filter((t) => t.format?.protocol === 'progressive');
    const hlsAac = clean.filter(
      (t) =>
        t.format?.protocol === 'hls' &&
        (t.preset === 'aac_160k' || t.preset === 'aac_96k' || t.format?.mime_type?.includes('mp4'))
    );
    const hlsOther = clean.filter((t) => t.format?.protocol === 'hls' && !hlsAac.includes(t));
    const other = clean.filter((t) => !progressive.includes(t) && !hlsAac.includes(t) && !hlsOther.includes(t));

    return [...progressive, ...hlsAac, ...hlsOther, ...other];
  }

  public async getTrackStreamUrl(track: Track, forceRefresh = false): Promise<string | null> {
    if (forceRefresh) {
      this.streamUrlCache.delete(track.id);
      delete (track as any).streamUrl;
    } else {
      const cached = this.streamUrlCache.get(track.id);
      if (cached && Date.now() - cached.ts < 180000) {
        track.streamUrl = cached.url;
        return cached.url;
      }
      if (track.streamUrl) {
        this.streamUrlCache.set(track.id, { url: track.streamUrl, ts: Date.now() });
        return track.streamUrl;
      }
    }

    let transcodings = track.media?.transcodings;
    if (!transcodings || transcodings.length === 0) {
      try {
        const trackRes = await this.fetchWithRetry(this.buildUrl(`/tracks/${track.id}`));
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          transcodings = trackData.media?.transcodings;
          if (trackData.track_authorization && !track.track_authorization) {
            track.track_authorization = trackData.track_authorization;
          }
        }
      } catch {
        return null;
      }
    }

    const ordered = this.prioritizeTranscodings(transcodings || []);
    if (ordered.length === 0) return null;

    // Try ordered transcodings sequentially until a working stream is resolved
    for (const selected of ordered) {
      try {
        const url = new URL(selected.url);
        url.searchParams.set('client_id', authService.getClientId());
        if (track.track_authorization) {
          url.searchParams.set('track_authorization', track.track_authorization);
        }

        const res = await this.fetchWithRetry(url.toString(), undefined, 2);
        if (!res.ok) continue;

        const data = await res.json();
        const streamUrl = data.url || null;
        if (streamUrl) {
          track.streamUrl = streamUrl;
          this.streamUrlCache.set(track.id, { url: streamUrl, ts: Date.now() });
          return streamUrl;
        }
      } catch {}
    }

    return null;
  }

  public async searchTracks(query: string, limit: number = 35): Promise<Track[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cacheKey = `search_${trimmed.toLowerCase()}_${limit}`;
    const cached = this.getCachedData<Track[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const res = await this.fetchWithRetry(this.buildUrl('/search/tracks', { q: trimmed, limit }));
      if (!res.ok) return [];
      const data = await res.json();
      const collection = data.collection || [];
      const localLikes = this.getLocalLikes();
      const likedSet = new Set(localLikes.map((t) => t.id));

      const tracks = collection.map((raw: any) => {
        const t = this.mapRawTrack(raw);
        if (likedSet.has(t.id)) t.liked = true;
        this.registerTrack(t);
        return t;
      });
      if (tracks.length > 0) {
        this.setCachedData(cacheKey, tracks, 180000);
      }
      return tracks;
    } catch {
      return [];
    }
  }

  public async getStream(limit: number = 40): Promise<Track[]> {
    return this.getUserPlayHistory();
  }

  public async getTrending(limit: number = 50): Promise<Track[]> {
    return this.getTopCharts();
  }

  public async fetchTrack(id: number): Promise<Track | null> {
    const existing = this.getTrack(id);
    if (existing) return existing;
    try {
      const res = await this.fetchWithRetry(this.buildUrl(`/tracks/${id}`));
      if (!res.ok) return null;
      const data = await res.json();
      const t = this.mapRawTrack(data);
      this.registerTrack(t);
      return t;
    } catch {
      return null;
    }
  }

  public async getUserPlayHistory(): Promise<Track[]> {
    try {
      const res = await this.fetchWithRetry(this.buildUrl('/me/play-history/tracks', { limit: 40 }));
      if (!res.ok) return [];
      const data = await res.json();
      const collection = data.collection || [];
      const localLikes = this.getLocalLikes();
      const likedSet = new Set(localLikes.map((t) => t.id));

      return collection.map((item: any) => {
        const t = this.mapRawTrack(item.track || item);
        if (likedSet.has(t.id)) t.liked = true;
        this.registerTrack(t);
        return t;
      });
    } catch {
      return [];
    }
  }

  public async getUserLikes(): Promise<Track[]> {
    const localLikes = this.getLocalLikes();
    const session = authService.getSession();
    const userId = session.user?.id || 1764659103;

    try {
      const res = await this.fetchWithRetry(this.buildUrl(`/users/${userId}/likes`, { limit: 50 }));
      let remoteLikes: Track[] = [];
      if (res.ok) {
        const data = await res.json();
        const collection = data.collection || [];
        remoteLikes = collection.map((item: any) => this.mapRawTrack(item.track || item));
      }

      const mergedMap = new Map<number, Track>();
      for (const t of localLikes) {
        t.liked = true;
        mergedMap.set(t.id, t);
        this.registerTrack(t);
      }
      for (const t of remoteLikes) {
        t.liked = true;
        mergedMap.set(t.id, t);
        this.registerTrack(t);
      }
      return Array.from(mergedMap.values());
    } catch {
      for (const t of localLikes) {
        this.registerTrack(t);
      }
      return localLikes;
    }
  }

  public getLocalLikes(): Track[] {
    try {
      const saved = localStorage.getItem(LOCAL_LIKES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  public isTrackLiked(trackId: number): boolean {
    const likes = this.getLocalLikes();
    return likes.some((t) => t.id === trackId);
  }

  public toggleLocalLike(trackOrId: Track | number): boolean {
    let track: Track | undefined;
    if (typeof trackOrId === 'number') {
      track = this.trackRegistry.get(trackOrId);
    } else {
      track = trackOrId;
      this.registerTrack(track);
    }

    if (!track) return false;

    const likes = this.getLocalLikes();
    const idx = likes.findIndex((t) => t.id === track!.id);
    let isNowLiked = false;

    if (idx >= 0) {
      likes.splice(idx, 1);
      isNowLiked = false;
    } else {
      likes.unshift({ ...track, liked: true });
      isNowLiked = true;
    }

    track.liked = isNowLiked;
    this.registerTrack(track);
    localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(likes));
    this.notifyLikes(track.id, isNowLiked);

    const session = authService.getSession();
    const userId = session.user?.id;
    if (userId) {
      const method = isNowLiked ? 'PUT' : 'DELETE';
      fetch(this.buildUrl(`/users/${userId}/track_likes/${track.id}`), {
        method,
        headers: this.getHeaders(),
      }).catch(() => {});
    }

    return isNowLiked;
  }

  public async resolvePlaylistTracks(rawTracks: any[]): Promise<Track[]> {
    if (!rawTracks || rawTracks.length === 0) return [];

    const fullTracks: Track[] = [];
    const stubIds: number[] = [];

    for (const raw of rawTracks) {
      if (raw.title && raw.media) {
        const t = this.mapRawTrack(raw);
        fullTracks.push(t);
        this.registerTrack(t);
      } else if (raw.id) {
        stubIds.push(raw.id);
      }
    }

    if (stubIds.length > 0) {
      const chunkSize = 30;
      for (let i = 0; i < stubIds.length; i += chunkSize) {
        const slice = stubIds.slice(i, i + chunkSize);
        try {
          const res = await this.fetchWithRetry(this.buildUrl('/tracks', { ids: slice.join(',') }));
          if (res.ok) {
            const fetched = await res.json();
            if (Array.isArray(fetched)) {
              for (const item of fetched) {
                const t = this.mapRawTrack(item);
                fullTracks.push(t);
                this.registerTrack(t);
              }
            }
          }
        } catch {}
      }
    }

    const localLikes = this.getLocalLikes();
    const likedSet = new Set(localLikes.map((t) => t.id));
    for (const t of fullTracks) {
      if (likedSet.has(t.id)) {
        t.liked = true;
      }
    }

    return fullTracks;
  }

  private normalizeTitleKey(title: string): string {
    return (title || '')
      .toLowerCase()
      .replace(/^(related\s+tracks\s*:?|stations?\s+based\s+on\s*:?|station\s*:?|track\s+station\s*:?|playlist\s*:?)/i, '')
      .replace(/[^a-z0-9а-яё]/gi, '')
      .trim();
  }

  public async getUserPlaylists(): Promise<Playlist[]> {
    const session = authService.getSession();
    const userId = session.user?.id;
    const playlists: Playlist[] = [];
    const seenIds = new Set<string | number>();
    const seenTitles = new Set<string>();

    if (userId) {
      try {
        const res = await this.fetchWithRetry(this.buildUrl(`/users/${userId}/playlists`, { limit: 30 }));
        if (res.ok) {
          const data = await res.json();
          const collection = data.collection || [];
          for (const item of collection) {
            const p = item.playlist || item;
            if (!p || !p.title) continue;
            const norm = this.normalizeTitleKey(p.title);
            if (seenIds.has(p.id) || (norm && seenTitles.has(norm))) continue;

            const resolvedTracks = await this.resolvePlaylistTracks(p.tracks || []);
            const fallbackArtwork = resolvedTracks.length > 0 ? resolvedTracks[0].artwork : (p.artwork_url || p.user?.avatar_url || '');
            
            seenIds.add(p.id);
            if (norm) seenTitles.add(norm);

            playlists.push({
              id: p.id,
              title: p.title,
              artist: p.user?.username || session.user?.username || 'You',
              artwork: p.artwork_url || fallbackArtwork,
              updatedDaysAgo: this.daysAgo(p.last_modified || p.created_at),
              created_at: p.created_at,
              updated_at: p.last_modified || p.updated_at,
              tracks: resolvedTracks,
            });
          }
        }
      } catch {}
    }

    const featured = await this.getFeaturedPlaylists();
    for (const f of featured) {
      const norm = this.normalizeTitleKey(f.title);
      if (!seenIds.has(f.id) && (!norm || !seenTitles.has(norm))) {
        seenIds.add(f.id);
        if (norm) seenTitles.add(norm);
        playlists.push(f);
      }
    }

    return playlists;
  }

  public async getPlaylistDetails(playlistId: number | string): Promise<Playlist | null> {
    try {
      const res = await this.fetchWithRetry(this.buildUrl(`/playlists/${playlistId}`));
      if (!res.ok) return null;
      const p = await res.json();
      const resolvedTracks = await this.resolvePlaylistTracks(p.tracks || []);
      const fallbackArtwork = resolvedTracks.length > 0 ? resolvedTracks[0].artwork : '';
      return {
        id: p.id,
        title: p.title || 'SoundCloud Playlist',
        artist: p.user?.username === 'New!' ? 'SoundCloud Curated' : (p.user?.username || 'SoundCloud Curated'),
        artwork: p.artwork_url || fallbackArtwork || p.user?.avatar_url || '',
        updatedDaysAgo: this.daysAgo(p.last_modified || p.created_at),
        created_at: p.created_at,
        updated_at: p.last_modified || p.updated_at,
        tracks: resolvedTracks,
      };
    } catch {
      return null;
    }
  }

  public async getFeaturedPlaylists(): Promise<Playlist[]> {
    const cached = this.getCachedData<Playlist[]>('featured_playlists_v2');
    if (cached && cached.length > 0) return cached;

    const playlists: Playlist[] = [];
    const seenIds = new Set<string | number>();
    const seenTitles = new Set<string>();

    const addPlaylistIfUnique = (p: Playlist): boolean => {
      if (!p || !p.title) return false;
      const rawTitle = p.title.trim();
      const lower = rawTitle.toLowerCase();

      // Exclude automated track stations to eliminate repeated "Related tracks: ..." cards
      if (
        lower.startsWith('related tracks:') ||
        lower.startsWith('station:') ||
        lower.startsWith('stations based on') ||
        String(p.id).includes('track-station')
      ) {
        return false;
      }

      if (seenIds.has(p.id)) return false;

      const norm = this.normalizeTitleKey(p.title);
      if (!norm || seenTitles.has(norm)) return false;

      seenIds.add(p.id);
      seenTitles.add(norm);

      // Clean up artist if it was set to editorial badge like "New!"
      if (p.artist === 'New!' || !p.artist) {
        p.artist = 'SoundCloud Editorial';
      }

      playlists.push(p);
      return true;
    };

    try {
      const res = await this.fetchWithRetry(this.buildUrl('/mixed-selections', { limit: 12 }));
      if (res.ok) {
        const data = await res.json();
        for (const section of data.collection || []) {
          for (const item of section.items?.collection || []) {
            if (!item) continue;
            if (item.kind === 'track') continue;

            const title = item.title || item.name;
            if (!title) continue;

            const fallbackArtwork =
              item.artwork_url ||
              item.user?.avatar_url ||
              (item.tracks?.[0]?.artwork_url) ||
              '';

            const resolvedTracks = item.tracks
              ? await this.resolvePlaylistTracks(item.tracks.slice(0, 35))
              : [];

            const p: Playlist = {
              id: item.id,
              title: title,
              artist: item.user?.username || section.title || 'SoundCloud Curated',
              artwork: fallbackArtwork || (resolvedTracks[0]?.artwork ?? ''),
              updatedDaysAgo: this.daysAgo(item.last_modified || item.created_at),
              created_at: item.created_at,
              updated_at: item.last_modified || item.updated_at,
              tracks: resolvedTracks,
            };

            addPlaylistIfUnique(p);
          }
        }
      }
    } catch {}

    // Ensure all categories (Curated, Electronic, Hip-Hop, Indie & Pop, Rock) have rich editorial content
    if (playlists.length < 24) {
      const curatedQueries = [
        'SoundCloud Weekly',
        'Electronic Essentials',
        'Hip-Hop Hits 2026',
        'Emerging Indie Dreams',
        'Rock & Metal Buzzing',
        'Top 50 Hits',
        'Phonk & Wave',
        'New Techno Now',
      ];
      for (const q of curatedQueries) {
        try {
          const res = await this.fetchWithRetry(this.buildUrl('/search/playlists', { q, limit: 3 }));
          if (res.ok) {
            const data = await res.json();
            for (const item of data.collection || []) {
              const p = item.playlist || item;
              if (p && p.title && p.tracks && p.tracks.length > 0) {
                const resolvedTracks = await this.resolvePlaylistTracks(p.tracks.slice(0, 25));
                if (resolvedTracks.length > 0) {
                  const entry: Playlist = {
                    id: p.id,
                    title: p.title,
                    artist: p.user?.username || 'SoundCloud Curated',
                    artwork: p.artwork_url || resolvedTracks[0]?.artwork || '',
                    updatedDaysAgo: this.daysAgo(p.last_modified || p.created_at),
                    created_at: p.created_at,
                    updated_at: p.last_modified || p.updated_at,
                    tracks: resolvedTracks,
                  };
                  addPlaylistIfUnique(entry);
                }
              }
            }
          }
        } catch {}
      }
    }

    if (playlists.length > 0) {
      this.setCachedData('featured_playlists_v2', playlists, 300000);
    }

    return playlists;
  }

  public async getTrendingTracks(): Promise<Track[]> {
    return this.getTopCharts();
  }

  public async getTopCharts(): Promise<Track[]> {
    const cached = this.getCachedData<Track[]>('top_charts_50');
    if (cached && cached.length > 0) return cached;

    try {
      const res = await this.fetchWithRetry(this.buildUrl('/charts', { kind: 'trending', limit: 50 }));
      if (res.ok) {
        const data = await res.json();
        const collection = data.collection || [];
        if (collection.length > 0) {
          const localLikes = this.getLocalLikes();
          const likedSet = new Set(localLikes.map((t) => t.id));
          const tracks = collection.map((item: any) => {
            const raw = item.track || item;
            const t = this.mapRawTrack(raw);
            if (likedSet.has(t.id)) t.liked = true;
            this.registerTrack(t);
            return t;
          });
          this.setCachedData('top_charts_50', tracks, 300000);
          return tracks;
        }
      }
    } catch {}

    try {
      const res = await this.fetchWithRetry(this.buildUrl('/search/tracks', { q: 'Top 50 Hits 2026', limit: 35 }));
      if (!res.ok) return [];
      const data = await res.json();
      const collection = data.collection || [];
      const localLikes = this.getLocalLikes();
      const likedSet = new Set(localLikes.map((t) => t.id));
      return collection.map((raw: any) => {
        const t = this.mapRawTrack(raw);
        if (likedSet.has(t.id)) t.liked = true;
        this.registerTrack(t);
        return t;
      });
    } catch {
      return [];
    }
  }

  public async getNewReleases(): Promise<Track[]> {
    try {
      const res = await this.fetchWithRetry(this.buildUrl('/search/tracks', { q: '2026 new releases music', limit: 30 }));
      if (!res.ok) return [];
      const data = await res.json();
      const collection = data.collection || [];
      const localLikes = this.getLocalLikes();
      const likedSet = new Set(localLikes.map((t) => t.id));
      return collection.map((raw: any) => {
        const t = this.mapRawTrack(raw);
        if (likedSet.has(t.id)) t.liked = true;
        this.registerTrack(t);
        return t;
      });
    } catch {
      return [];
    }
  }

  public async getGenreTracks(genre: string): Promise<Track[]> {
    const cacheKey = `genre_${genre}`;
    const cached = this.getCachedData<Track[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const q = genre === 'All' ? 'Trending Hits 2026' : `${genre} 2026`;
      const res = await this.fetchWithRetry(this.buildUrl('/search/tracks', { q, limit: 30 }));
      if (!res.ok) return [];
      const data = await res.json();
      const collection = data.collection || [];
      const localLikes = this.getLocalLikes();
      const likedSet = new Set(localLikes.map((t) => t.id));

      const tracks = collection.map((raw: any) => {
        const t = this.mapRawTrack(raw);
        if (likedSet.has(t.id)) t.liked = true;
        this.registerTrack(t);
        return t;
      });
      if (tracks.length > 0) {
        this.setCachedData(cacheKey, tracks, 300000);
      }
      return tracks;
    } catch {
      return [];
    }
  }

  public async getTrackComments(trackId: number): Promise<Comment[]> {
    const localKey = `sc_comments_${trackId}`;
    let localComments: Comment[] = [];
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) localComments = JSON.parse(stored);
    } catch {}

    try {
      const res = await this.fetchWithRetry(
        this.buildUrl(`/tracks/${trackId}/comments`, { threaded: 0, filter_replies: 0, limit: 40 })
      );
      let remoteComments: Comment[] = [];
      if (res.ok) {
        const data = await res.json();
        const collection = data.collection || [];
        remoteComments = collection.map((c: any) => ({
          id: c.id,
          body: c.body,
          timestamp: c.timestamp,
          created_at: c.created_at,
          user: {
            id: c.user?.id,
            username: c.user?.username || 'User',
            avatar_url: c.user?.avatar_url || 'https://a1.sndcdn.com/images/default_avatar_large.png',
          },
        }));
      }

      const map = new Map<number, Comment>();
      for (const c of localComments) map.set(c.id, c);
      for (const c of remoteComments) map.set(c.id, c);
      const all = Array.from(map.values());
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return all;
    } catch {
      return localComments;
    }
  }

  public async postTrackComment(trackId: number, body: string, timestampMs: number): Promise<Comment | null> {
    if (!body.trim()) return null;
    const session = authService.getSession();
    const user = session.user;

    const newComment: Comment = {
      id: Date.now(),
      body: body.trim(),
      timestamp: Math.round(timestampMs),
      created_at: new Date().toISOString(),
      user: {
        id: user?.id || Date.now(),
        username: user?.username || 'You',
        avatar_url: user?.avatar_url || '',
      },
    };

    const localKey = `sc_comments_${trackId}`;
    try {
      const stored = localStorage.getItem(localKey);
      const list: Comment[] = stored ? JSON.parse(stored) : [];
      list.unshift(newComment);
      localStorage.setItem(localKey, JSON.stringify(list));
    } catch {}

    fetch(this.buildUrl(`/tracks/${trackId}/comments`), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: {
          body: body.trim(),
          timestamp: Math.round(timestampMs),
        },
      }),
    }).catch(() => {});

    return newComment;
  }

  public async fetchWaveformData(waveformUrl: string): Promise<number[]> {
    try {
      const res = await fetch(waveformUrl);
      if (!res.ok) return [];
      const data = await res.json();
      const samples = data.samples || [];
      if (samples.length === 0) return [];

      const barsCount = 76;
      const step = Math.floor(samples.length / barsCount);
      const bars: number[] = [];
      const maxSample = Math.max(...samples, 1);

      for (let i = 0; i < barsCount; i++) {
        const chunk = samples.slice(i * step, (i + 1) * step);
        const avg = chunk.reduce((acc: number, val: number) => acc + val, 0) / (chunk.length || 1);
        bars.push(Math.max(0.1, Math.min(1, avg / maxSample)));
      }
      return bars;
    } catch {
      return [];
    }
  }

  public mapRawTrack(raw: any): Track {
    const artwork = raw.artwork_url
      ? raw.artwork_url.replace('-large', '-t500x500')
      : raw.user?.avatar_url || 'https://images.pexels.com/photos/35113490/pexels-photo-35113490.jpeg?auto=compress&cs=tinysrgb&h=400&w=400';

    const playsFormatted = raw.playback_count
      ? raw.playback_count >= 1000000
        ? `${(raw.playback_count / 1000000).toFixed(1)}M`
        : raw.playback_count >= 1000
        ? `${Math.round(raw.playback_count / 1000)}K`
        : String(raw.playback_count)
      : '0';

    return {
      id: raw.id,
      title: raw.title || 'Untitled Track',
      artist: raw.user?.username || 'Unknown Artist',
      artwork,
      duration: Math.round((raw.duration || 0) / 1000),
      plays: playsFormatted,
      liked: Boolean(raw.user_favorite),
      created_at: raw.created_at || raw.display_date || undefined,
      display_date: raw.display_date || raw.created_at || undefined,
      description: raw.description,
      genre: raw.genre,
      tag_list: raw.tag_list,
      permalink_url: raw.permalink_url,
      artistId: raw.user?.id,
      user: raw.user
        ? {
            id: raw.user.id,
            username: raw.user.username,
            avatar_url: raw.user.avatar_url,
            permalink_url: raw.user.permalink_url,
            city: raw.user.city,
            country_code: raw.user.country_code,
          }
        : undefined,
      waveform_url: raw.waveform_url,
      media: raw.media,
      track_authorization: raw.track_authorization,
    };
  }

  public async getArtistById(userId: number | string): Promise<UserProfile | null> {
    try {
      const res = await this.fetchWithRetry(this.buildUrl(`/users/${userId}`));
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id,
        username: data.username,
        avatar_url: data.avatar_url ? data.avatar_url.replace('-large', '-t500x500') : '',
        header_image_url: data.visuals?.visuals?.[0]?.visual_url || '',
        city: data.city,
        country_code: data.country_code,
        followers_count: data.followers_count,
        followings_count: data.followings_count,
        track_count: data.track_count,
        playlist_count: data.playlist_count,
        permalink_url: data.permalink_url,
        description: data.description,
        verified: Boolean(data.verified || data.badges?.pro_unlimited || data.badges?.verified),
      };
    } catch {
      return null;
    }
  }

  public async getArtistByName(artistName: string): Promise<UserProfile | null> {
    const trimmed = artistName.trim();
    if (!trimmed) return null;

    try {
      const res = await this.fetchWithRetry(this.buildUrl('/search/users', { q: trimmed, limit: 5 }));
      if (!res.ok) return null;
      const data = await res.json();
      const collection = data.collection || [];
      if (collection.length === 0) return null;

      // Find exact match or best candidate
      const exact = collection.find(
        (u: any) => u.username?.toLowerCase() === trimmed.toLowerCase()
      ) || collection[0];

      return this.getArtistById(exact.id);
    } catch {
      return null;
    }
  }

  public async getArtistTracks(userId: number | string, limit = 50): Promise<Track[]> {
    try {
      const res = await this.fetchWithRetry(this.buildUrl(`/users/${userId}/tracks`, { limit }));
      if (!res.ok) return [];
      const data = await res.json();
      const collection = data.collection || [];
      const localLikes = this.getLocalLikes();
      const likedSet = new Set(localLikes.map((t) => t.id));

      return collection.map((raw: any) => {
        const t = this.mapRawTrack(raw);
        if (likedSet.has(t.id)) t.liked = true;
        this.registerTrack(t);
        return t;
      });
    } catch {
      return [];
    }
  }

  public async getArtistPlaylists(userId: number | string, limit = 20): Promise<Playlist[]> {
    try {
      const res = await this.fetchWithRetry(this.buildUrl(`/users/${userId}/playlists`, { limit }));
      if (!res.ok) return [];
      const data = await res.json();
      const collection = data.collection || [];
      const playlists: Playlist[] = [];

      for (const item of collection) {
        const p = item.playlist || item;
        const resolvedTracks = await this.resolvePlaylistTracks(p.tracks || []);
        const fallbackArtwork = resolvedTracks.length > 0 ? resolvedTracks[0].artwork : '';
        playlists.push({
          id: p.id,
          title: p.title,
          artist: p.user?.username || 'Artist',
          artwork: p.artwork_url || fallbackArtwork || p.user?.avatar_url || '',
          updatedDaysAgo: this.daysAgo(p.last_modified || p.created_at),
          created_at: p.created_at,
          updated_at: p.last_modified || p.updated_at,
          tracks: resolvedTracks,
        });
      }
      return playlists;
    } catch {
      return [];
    }
  }
}

export const soundcloudApi = SoundCloudApi.getInstance();
