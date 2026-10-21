export interface Track {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  plays: string;
  liked: boolean;
  created_at?: string;
  display_date?: string;
  waveform?: number[];
  waveform_url?: string;
  streamUrl?: string;
  track_authorization?: string;
  media?: {
    transcodings: Array<{
      url: string;
      preset: string;
      duration: number;
      format: {
        protocol: string;
        mime_type: string;
      };
      quality: string;
    }>;
  };
}

export interface Playlist {
  id: number | string;
  title: string;
  artist: string;
  artwork: string;
  updatedDaysAgo: number;
  created_at?: string;
  updated_at?: string;
  tracks: Track[];
}

export interface UserProfile {
  id: number;
  username: string;
  avatar_url: string;
  city?: string;
  country_code?: string;
  followers_count?: number;
  followings_count?: number;
  track_count?: number;
  playlist_count?: number;
  permalink_url?: string;
  description?: string;
}

export interface Comment {
  id: number;
  body: string;
  timestamp: number;
  created_at: string;
  user: {
    id: number;
    username: string;
    avatar_url: string;
  };
}

export interface DownloadItem {
  id: number;
  trackId: number;
  title: string;
  artist: string;
  artwork: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  filePath?: string;
  error?: string;
}

export interface AuthSession {
  oauthToken: string;
  clientId: string;
  user?: UserProfile;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricLine[];
  plainText?: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}
