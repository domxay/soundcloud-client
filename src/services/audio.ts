import Hls from 'hls.js';
import { Track } from '@/types';
import { soundcloudApi } from './api';

export type PlaybackListener = (state: {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
}) => void;

export class AudioService {
  private static instance: AudioService;
  private audio: HTMLAudioElement;
  private hls: Hls | null = null;
  private listeners: Set<PlaybackListener> = new Set();
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private onEndedCallback: (() => void) | null = null;
  private repeatMode: boolean = false;

  private constructor() {
    this.audio = new Audio();
    this.setupListeners();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private setupListeners(): void {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notify();
      if (this.repeatMode) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      } else if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });
  }

  private notify(): void {
    const duration = this.audio.duration || this.currentTrack?.duration || 0;
    const currentTime = this.audio.currentTime || 0;
    const progress = duration > 0 ? currentTime / duration : 0;
    const state = {
      isPlaying: this.isPlaying,
      currentTime,
      duration,
      progress,
    };
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setOnEnded(cb: () => void): void {
    this.onEndedCallback = cb;
  }

  public setRepeat(repeat: boolean): void {
    this.repeatMode = repeat;
  }

  public async playTrack(track: Track): Promise<void> {
    this.currentTrack = track;

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    const streamUrl = await soundcloudApi.getTrackStreamUrl(track);
    if (!streamUrl) {
      return;
    }

    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.audio);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.audio.play().catch(() => {});
      });
    } else {
      this.audio.src = streamUrl;
      this.audio.play().catch(() => {});
    }
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch(() => {});
    }
  }

  public seek(progress: number): void {
    const duration = this.audio.duration || this.currentTrack?.duration || 0;
    if (duration > 0) {
      this.audio.currentTime = progress * duration;
    }
  }

  public setVolume(vol: number): void {
    this.audio.volume = Math.max(0, Math.min(1, vol / 100));
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }
}

export const audioService = AudioService.getInstance();
