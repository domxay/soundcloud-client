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
  description?: string;
  genre?: string;
  tag_list?: string;
  permalink_url?: string;
  artistId?: number;
  user?: {
    id: number;
    username: string;
    avatar_url: string;
    permalink_url?: string;
    city?: string;
    country_code?: string;
  };
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
  header_image_url?: string;
  city?: string;
  country_code?: string;
  followers_count?: number;
  followings_count?: number;
  track_count?: number;
  playlist_count?: number;
  permalink_url?: string;
  description?: string;
  verified?: boolean;
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
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface OverlayState {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  activeLyric?: string;
  nextLyric?: string;
  themeAccent?: string;
}

export interface ElectronAPI {
  openLoginWindow: () => Promise<{ success: boolean; token?: string; clientId?: string; error?: string }>;
  syncSession: () => Promise<{ success: boolean; token?: string; clientId?: string; error?: string }>;
  getClientId: (forceRefresh?: boolean) => Promise<string>;
  downloadTrack: (trackData: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  openDownloadsFolder: () => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  selectSaveFile: (defaultName: string) => Promise<string | null>;
  selectDownloadFolder: () => Promise<string | null>;
  selectBackgroundFile: () => Promise<any>;
  setProxy: (rule: string | null) => Promise<{ success: boolean; proxy?: string; error?: string }>;
  testProxy: (rule?: string | null) => Promise<any>;
  detectLocalProxy: () => Promise<any>;
  getNetworkSettings: () => Promise<any>;
  setDoh: (enabled: boolean) => Promise<any>;
  builtinProxyStart: (port: number) => Promise<any>;
  builtinProxyStop: () => Promise<any>;
  builtinProxyStatus: () => Promise<any>;
  relaunchApp: () => Promise<any>;
  // Overlay IPC
  sendOverlayState: (state: OverlayState) => void;
  onOverlayState: (callback: (state: OverlayState) => void) => () => void;
  sendOverlayAction: (action: string, payload?: any) => void;
  onOverlayCommand: (callback: (cmd: { action: string; payload?: any }) => void) => () => void;
  resizeOverlay: (width: number, height: number) => Promise<void>;
  moveOverlay?: (deltaX: number, deltaY: number) => void;
  restoreMainWindow: () => Promise<void>;
  toggleOverlay: (show?: boolean) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
