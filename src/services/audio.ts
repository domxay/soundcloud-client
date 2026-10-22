import Hls from 'hls.js';
import { Track } from '@/types';
import { soundcloudApi } from './api';

export type PlaybackListener = (state: {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  speed: number;
  sleepTimerSeconds: number | null;
}) => void;

export type EqualizerPreset = 'flat' | 'bass_boost' | 'treble_boost' | 'vocal' | 'phonk' | 'rock';

export class AudioService {
  private static instance: AudioService;
  private audio: HTMLAudioElement;
  private hls: Hls | null = null;
  private listeners: Set<PlaybackListener> = new Set();
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private onEndedCallback: (() => void) | null = null;
  private repeatMode: boolean = false;
  private speed: number = 1.0;
  private lastNonZeroVolume: number = 75;

  // Sleep Timer
  private sleepTimerId: any = null;
  private sleepTimerEndsAt: number | null = null;
  private progressInterval: any = null;

  // Web Audio Equalizer
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private currentEqPreset: EqualizerPreset = 'flat';

  private constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.setupListeners();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private initAudioContext(): void {
    if (this.audioContext) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);

      // Low shelf (Bass: 100Hz)
      this.bassFilter = this.audioContext.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 100;
      this.bassFilter.gain.value = 0;

      // Peaking (Mid: 1000Hz)
      this.midFilter = this.audioContext.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 1000;
      this.midFilter.Q.value = 1;
      this.midFilter.gain.value = 0;

      // High shelf (Treble: 3000Hz)
      this.trebleFilter = this.audioContext.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 3000;
      this.trebleFilter.gain.value = 0;

      // Chain: Source -> Bass -> Mid -> Treble -> Destination
      this.sourceNode.connect(this.bassFilter);
      this.bassFilter.connect(this.midFilter);
      this.midFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.audioContext.destination);
    } catch {}
  }

  public setEqualizerPreset(preset: EqualizerPreset): void {
    this.initAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    this.currentEqPreset = preset;

    if (!this.bassFilter || !this.midFilter || !this.trebleFilter) return;

    switch (preset) {
      case 'bass_boost':
        this.bassFilter.gain.value = 7.5;
        this.midFilter.gain.value = 1.0;
        this.trebleFilter.gain.value = -1.0;
        break;
      case 'treble_boost':
        this.bassFilter.gain.value = -2.0;
        this.midFilter.gain.value = 1.5;
        this.trebleFilter.gain.value = 6.0;
        break;
      case 'vocal':
        this.bassFilter.gain.value = -3.0;
        this.midFilter.gain.value = 5.0;
        this.trebleFilter.gain.value = 2.0;
        break;
      case 'phonk':
        this.bassFilter.gain.value = 9.0;
        this.midFilter.gain.value = -2.0;
        this.trebleFilter.gain.value = 4.0;
        break;
      case 'rock':
        this.bassFilter.gain.value = 4.5;
        this.midFilter.gain.value = -1.0;
        this.trebleFilter.gain.value = 4.0;
        break;
      case 'flat':
      default:
        this.bassFilter.gain.value = 0;
        this.midFilter.gain.value = 0;
        this.trebleFilter.gain.value = 0;
        break;
    }
  }

  public getEqualizerPreset(): EqualizerPreset {
    return this.currentEqPreset;
  }

  private startProgressTicker(): void {
    this.stopProgressTicker();
    this.progressInterval = setInterval(() => {
      if (this.isPlaying) {
        this.notify();
      }
    }, 50);
  }

  private stopProgressTicker(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private setupListeners(): void {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      this.startProgressTicker();
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.stopProgressTicker();
      this.notify();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.stopProgressTicker();
      this.notify();
      if (this.repeatMode) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      } else if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });

    this.audio.addEventListener('error', async () => {
      if (this.currentTrack) {
        const fresh = await soundcloudApi.getTrackStreamUrl(this.currentTrack, true);
        if (fresh) {
          if (this.hls) {
            this.hls.loadSource(fresh);
            this.hls.startLoad();
          } else {
            this.audio.src = fresh;
            this.audio.play().catch(() => {});
          }
        }
      }
    });
  }

  private notify(): void {
    const duration = this.audio.duration || this.currentTrack?.duration || 0;
    const currentTime = this.audio.currentTime || 0;
    const progress = duration > 0 ? currentTime / duration : 0;
    let sleepSeconds: number | null = null;
    if (this.sleepTimerEndsAt) {
      sleepSeconds = Math.max(0, Math.round((this.sleepTimerEndsAt - Date.now()) / 1000));
    }
    const state = {
      isPlaying: this.isPlaying,
      currentTime,
      duration,
      progress,
      speed: this.speed,
      sleepTimerSeconds: sleepSeconds,
    };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {}
    }
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(2.5, speed));
    this.audio.playbackRate = this.speed;
    this.notify();
  }

  public getSpeed(): number {
    return this.speed;
  }

  public setSleepTimer(minutes: number | null): void {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
      this.sleepTimerEndsAt = null;
    }
    if (!minutes || minutes <= 0) {
      this.notify();
      return;
    }

    this.sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
    this.sleepTimerId = setTimeout(() => {
      this.audio.pause();
      this.sleepTimerId = null;
      this.sleepTimerEndsAt = null;
      this.notify();
    }, minutes * 60 * 1000);
    this.notify();
  }

  public getSleepTimerRemainingSeconds(): number | null {
    if (!this.sleepTimerEndsAt) return null;
    return Math.max(0, Math.round((this.sleepTimerEndsAt - Date.now()) / 1000));
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

  private async getStreamUrlWithRetry(
    track: Track,
    attempts: number,
    forceRefresh = false
  ): Promise<string | null> {
    for (let i = 0; i < attempts; i++) {
      const url = await soundcloudApi.getTrackStreamUrl(track, forceRefresh || i > 0);
      if (url) return url;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
    return null;
  }

  public async playTrack(track: Track, forceRefresh = false): Promise<void> {
    this.currentTrack = track;

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.audio.currentTime = 0;

    const streamUrl = await this.getStreamUrlWithRetry(track, 3, forceRefresh);
    if (!streamUrl) {
      if (this.onEndedCallback) {
        setTimeout(() => this.onEndedCallback?.(), 0);
      }
      return;
    }

    if (streamUrl.includes('.m3u8') && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 45,
        maxMaxBufferLength: 90,
        maxBufferSize: 60 * 1000 * 1000,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 5,
        fragLoadingTimeOut: 18000,
        fragLoadingMaxRetry: 6,
      });

      this.hls.on(Hls.Events.ERROR, async (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (
                this.currentTrack &&
                data.response &&
                (data.response.code === 403 || data.response.code === 404)
              ) {
                const freshUrl = await soundcloudApi.getTrackStreamUrl(this.currentTrack, true);
                if (freshUrl && this.hls) {
                  this.hls.loadSource(freshUrl);
                  this.hls.startLoad();
                  return;
                }
              }
              this.hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.hls?.recoverMediaError();
              break;
            default:
              this.hls?.destroy();
              this.hls = null;
              break;
          }
        }
      });

      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.audio);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.audio.playbackRate = this.speed;
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      });
    } else {
      this.audio.src = streamUrl;
      this.audio.playbackRate = this.speed;
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    }
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      const duration = this.audio.duration || this.currentTrack?.duration || 0;
      if (
        this.audio.ended ||
        (duration > 0 && this.audio.currentTime >= duration - 0.5)
      ) {
        this.audio.currentTime = 0;
      }
      this.audio.play().catch(async () => {
        if (this.currentTrack) {
          await this.playTrack(this.currentTrack, true);
        }
      });
    }
  }

  public seek(progress: number): void {
    const duration = this.audio.duration || this.currentTrack?.duration || 0;
    if (duration > 0) {
      this.audio.currentTime = progress * duration;
    }
  }

  public seekBy(deltaSeconds: number): void {
    const duration = this.audio.duration || this.currentTrack?.duration || 0;
    if (duration > 0) {
      const nextTime = Math.max(0, Math.min(duration, this.audio.currentTime + deltaSeconds));
      this.audio.currentTime = nextTime;
    }
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(100, vol));
    if (clamped > 0) {
      this.lastNonZeroVolume = clamped;
    }
    this.audio.volume = clamped / 100;
  }

  public toggleMute(): number {
    if (this.audio.volume > 0) {
      this.lastNonZeroVolume = Math.round(this.audio.volume * 100);
      this.setVolume(0);
      return 0;
    } else {
      const restore = this.lastNonZeroVolume || 75;
      this.setVolume(restore);
      return restore;
    }
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }
}

export const audioService = AudioService.getInstance();
