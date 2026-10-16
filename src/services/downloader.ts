import { Track, DownloadItem } from '@/types';
import { soundcloudApi } from './api';

export type DownloadProgressListener = (items: DownloadItem[]) => void;

export class DownloaderService {
  private static instance: DownloaderService;
  private downloads: Map<number, DownloadItem> = new Map();
  private listeners: Set<DownloadProgressListener> = new Set();

  private constructor() {}

  public static getInstance(): DownloaderService {
    if (!DownloaderService.instance) {
      DownloaderService.instance = new DownloaderService();
    }
    return DownloaderService.instance;
  }

  public subscribe(listener: DownloadProgressListener): () => void {
    this.listeners.add(listener);
    listener(Array.from(this.downloads.values()));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const list = Array.from(this.downloads.values());
    for (const listener of this.listeners) {
      listener(list);
    }
  }

  public async downloadTrack(track: Track, folderPath?: string): Promise<boolean> {
    let chosenPath: string | null = null;
    const sanitizedTitle = `${track.artist} - ${track.title}`.replace(/[\\/:*?"<>|]/g, '_').trim();
    const defaultName = `${sanitizedTitle}.m4a`;

    if (!folderPath && (window as any).electronAPI?.selectSaveFile) {
      chosenPath = await (window as any).electronAPI.selectSaveFile(defaultName);
      if (!chosenPath) {
        return false;
      }
    }

    const item: DownloadItem = {
      id: Date.now(),
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      progress: 0,
      status: 'downloading',
    };

    this.downloads.set(track.id, item);
    this.notify();

    try {
      const streamUrl = await soundcloudApi.getTrackStreamUrl(track);
      if (!streamUrl) {
        throw new Error('Stream URL not found');
      }

      if ((window as any).electronAPI?.downloadTrack) {
        const result = await (window as any).electronAPI.downloadTrack({
          id: track.id,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          streamUrl,
          destinationPath: chosenPath,
          destinationFolder: folderPath,
        });

        if (result.success) {
          item.status = 'completed';
          item.progress = 1;
          item.filePath = result.filePath;
        } else {
          item.status = 'error';
          item.error = result.error;
        }
      } else {
        const res = await fetch(streamUrl);
        const blob = await res.blob();
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        item.status = 'completed';
        item.progress = 1;
      }
      this.notify();
      return true;
    } catch (err: any) {
      item.status = 'error';
      item.error = err.message || 'Download failed';
      this.notify();
      return false;
    }
  }

  public async downloadPlaylist(tracks: Track[]): Promise<void> {
    if (tracks.length === 0) return;

    let targetFolder: string | null = null;
    if ((window as any).electronAPI?.selectDownloadFolder) {
      targetFolder = await (window as any).electronAPI.selectDownloadFolder();
      if (!targetFolder) {
        return;
      }
    }

    for (const track of tracks) {
      await this.downloadTrack(track, targetFolder || undefined);
    }
  }

  public getDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values());
  }
}

export const downloaderService = DownloaderService.getInstance();
