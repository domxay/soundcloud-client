interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly url: string;
}

interface Window {
  electronAPI?: {
    openLoginWindow: () => Promise<{ success: boolean; token?: string; clientId?: string; error?: string }>;
    downloadTrack: (trackData: {
      title: string;
      artist: string;
      streamUrl: string;
      destinationPath?: string;
      destinationFolder?: string;
    }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    openDownloadsFolder: () => Promise<boolean>;
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    selectSaveFile: (defaultName: string) => Promise<string | null>;
    selectDownloadFolder: () => Promise<string | null>;
    selectBackgroundFile: () => Promise<{ url: string; type: 'video' | 'image' } | null>;
    setProxy: (rule: string | null) => Promise<{ success: boolean; proxy?: string | null }>;
    detectLocalProxy?: () => Promise<{ success: boolean; proxy?: string; name?: string }>;
    getNetworkSettings?: () => Promise<{ dohEnabled?: boolean; builtinProxyEnabled?: boolean; builtinProxyPort?: number }>;
    setDoh?: (enabled: boolean) => Promise<{ success: boolean; requiresRestart?: boolean }>;
    builtinProxyStart?: (port: number) => Promise<{ success: boolean; port?: number; error?: string }>;
    builtinProxyStop?: () => Promise<{ success: boolean }>;
    builtinProxyStatus?: () => Promise<{ running: boolean; port: number }>;
    relaunchApp?: () => Promise<{ success: boolean }>;
  };
}
