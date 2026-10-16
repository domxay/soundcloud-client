import { Track, Playlist, UserProfile, Comment } from '@/types';
import { authService } from './auth';

const API_BASE = 'https://api-v2.soundcloud.com';
const LOCAL_LIKES_KEY = 'sc_local_likes';

export class SoundCloudApi {
  private static instance: SoundCloudApi;
  private trackRegistry: Map<number, Track> = new Map();
  private likeListeners: Set<(trackId: number, isLiked: boolean) => void> = new Set();

  private constructor() {}

  public static getInstance(): SoundCloudApi {
    if (!SoundCloudApi.instance) {
      SoundCloudApi.instance = new SoundCloudApi();
    }
    return SoundCloudApi.instance;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
      listener(trackId, isLiked);
    }
  }

  public async getCurrentUser(): Promise<UserProfile | null> {
    const token = authService.getOAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(this.buildUrl('/me'), {
        headers: this.getHeaders(),
      });
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

  public async getTrackStreamUrl(track: Track): Promise<string | null> {
    if (track.streamUrl) return track.streamUrl;

    let transcodings = track.media?.transcodings;
    if (!transcodings || transcodings.length === 0) {
      try {
        const trackRes = await fetch(this.buildUrl(`/tracks/${track.id}`), {
          headers: this.getHeaders(),
        });
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          transcodings = trackData.media?.transcodings;
        }
      } catch {
        return null;
      }
    }

    if (!transcodings || transcodings.length === 0) return null;

    const progressive = transcodings.find((t) => t.format.protocol === 'progressive');
    const hls = transcodings.find((t) => t.format.protocol === 'hls');
    const selected = progressive || hls || transcodings[0];

    try {
      const url = new URL(selected.url);
      url.searchParams.set('client_id', authService.getClientId());
      const res = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || null;
    } catch {
      return null;
    }
  }

  public async searchTracks(query: string): Promise<Track[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(this.buildUrl('/search/tracks', { q: query, limit: 35 }), {
        headers: this.getHeaders(),
      });
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
      return tracks;
    } catch {
      return [];
    }
  }

  public async getUserPlayHistory(): Promise<Track[]> {
    try {
      const res = await fetch(this.buildUrl('/me/play-history/tracks', { limit: 40 }), {
        headers: this.getHeaders(),
      });
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
      const res = await fetch(this.buildUrl(`/users/${userId}/likes`, { limit: 50 }), {
        headers: this.getHeaders(),
      });
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
          const res = await fetch(this.buildUrl('/tracks', { ids: slice.join(',') }), {
            headers: this.getHeaders(),
          });
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

  public async getUserPlaylists(): Promise<Playlist[]> {
    const session = authService.getSession();
    const userId = session.user?.id || 1764659103;
    const playlists: Playlist[] = [];

    try {
      const res = await fetch(this.buildUrl(`/users/${userId}/playlists`, { limit: 20 }), {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const collection = data.collection || [];
        for (const item of collection) {
          const p = item.playlist || item;
          const resolvedTracks = await this.resolvePlaylistTracks(p.tracks || []);
          playlists.push({
            id: p.id,
            title: p.title,
            artist: p.user?.username || 'Unknown',
            artwork: p.artwork_url || p.user?.avatar_url || 'https://images.pexels.com/photos/35113490/pexels-photo-35113490.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
            updatedDaysAgo: 1,
            tracks: resolvedTracks,
          });
        }
      }
    } catch {}

    if (playlists.length === 0) {
      const featured = await this.getFeaturedPlaylists();
      playlists.push(...featured);
    }

    return playlists;
  }

  public async getFeaturedPlaylists(): Promise<Playlist[]> {
    const queries = ['Top Hits 2026', 'Phonk 2026', 'Cyberpunk Synthwave', 'Hip Hop Essentials'];
    const playlists: Playlist[] = [];

    for (const q of queries) {
      try {
        const res = await fetch(this.buildUrl('/search/playlists', { q, limit: 2 }), {
          headers: this.getHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const collection = data.collection || [];
          for (const item of collection) {
            const p = item.playlist || item;
            if (p.tracks && p.tracks.length > 0) {
              const resolvedTracks = await this.resolvePlaylistTracks(p.tracks.slice(0, 30));
              if (resolvedTracks.length > 0) {
                playlists.push({
                  id: p.id,
                  title: p.title,
                  artist: p.user?.username || 'SoundCloud Curated',
                  artwork: p.artwork_url || p.user?.avatar_url || 'https://images.pexels.com/photos/35113490/pexels-photo-35113490.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
                  updatedDaysAgo: 1,
                  tracks: resolvedTracks,
                });
              }
            }
          }
        }
      } catch {}
    }

    return playlists;
  }

  public async getTrendingTracks(): Promise<Track[]> {
    try {
      const res = await fetch(this.buildUrl('/search/tracks', { q: 'Hits 2026 Phonk Trap Electronic', limit: 30 }), {
        headers: this.getHeaders(),
      });
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

  public async getTopCharts(): Promise<Track[]> {
    try {
      const res = await fetch(this.buildUrl('/search/tracks', { q: 'Top 50 Global Charts 2026', limit: 20 }), {
        headers: this.getHeaders(),
      });
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
    try {
      const q = genre === 'All' ? 'Trending Hits 2026' : `${genre} Hits 2026`;
      const res = await fetch(this.buildUrl('/search/tracks', { q, limit: 24 }), {
        headers: this.getHeaders(),
      });
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

  public async getTrackComments(trackId: number): Promise<Comment[]> {
    const localKey = `sc_comments_${trackId}`;
    let localComments: Comment[] = [];
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) localComments = JSON.parse(stored);
    } catch {}

    try {
      const res = await fetch(this.buildUrl(`/tracks/${trackId}/comments`, { threaded: 0, filter_replies: 0, limit: 40 }), {
        headers: this.getHeaders(),
      });
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
        id: user?.id || 1764659103,
        username: user?.username || 'domxay',
        avatar_url: user?.avatar_url || 'https://images.pexels.com/photos/7446857/pexels-photo-7446857.jpeg?auto=compress&cs=tinysrgb&h=80&w=80',
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
      waveform_url: raw.waveform_url,
      media: raw.media,
    };
  }
}

export const soundcloudApi = SoundCloudApi.getInstance();
