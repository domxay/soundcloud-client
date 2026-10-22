import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Download,
  Volume2,
  VolumeX,
  ListMusic,
  Loader2,
  MessageSquare,
  Mic2,
  SlidersHorizontal,
  Clock,
  Gauge,
  Zap,
  Sparkles,
  Mic,
  Radio,
  LucideIcon,
} from 'lucide-react';
import { Track, Comment } from '@/types';
import { formatTime } from '@/services/utils';
import { audioService, EqualizerPreset } from '@/services/audio';
import { useI18n } from '@/services/i18n';
import Waveform from './Waveform';

interface MiniPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeatMode: 'off' | 'one' | 'all';
  liked: boolean;
  downloading: boolean;
  queueCount?: number;
  isQueueOpen?: boolean;
  comments?: Comment[];
  speed?: number;
  sleepTimerSeconds?: number | null;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (progress: number) => void;
  onVolume: (vol: number) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onLike: () => void;
  onDownload: () => void;
  onToggleQueue?: () => void;
  onOpenComments?: () => void;
  onOpenLyrics?: () => void;
  onTrackTitleClick?: () => void;
  onArtistClick?: (artist: string) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track,
  isPlaying,
  progress,
  currentTime,
  duration,
  volume,
  shuffle,
  repeatMode,
  liked,
  downloading,
  queueCount = 0,
  isQueueOpen = false,
  comments = [],
  speed = 1.0,
  sleepTimerSeconds = null,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onShuffle,
  onRepeat,
  onLike,
  onDownload,
  onToggleQueue,
  onOpenComments,
  onOpenLyrics,
  onTrackTitleClick,
  onArtistClick,
}) => {
  const { t } = useI18n();
  const [eqOpen, setEqOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [currentEq, setCurrentEq] = useState<EqualizerPreset>(audioService.getEqualizerPreset());

  if (!track) return null;

  const handleSelectEq = (preset: EqualizerPreset) => {
    audioService.setEqualizerPreset(preset);
    setCurrentEq(preset);
    setEqOpen(false);
  };

  const handleSelectSpeed = (s: number) => {
    audioService.setSpeed(s);
    setSpeedOpen(false);
  };

  const handleSelectTimer = (min: number | null) => {
    audioService.setSleepTimer(min);
    setTimerOpen(false);
  };

  const handleToggleMute = () => {
    const next = audioService.toggleMute();
    onVolume(next);
  };

  const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
  const timers = [
    { label: t('timerOff'), val: null },
    { label: `15 ${t('minShort')}`, val: 15 },
    { label: `30 ${t('minShort')}`, val: 30 },
    { label: `45 ${t('minShort')}`, val: 45 },
    { label: `60 ${t('minShort')}`, val: 60 },
  ];
  const eqPresets: { id: EqualizerPreset; label: string; icon: LucideIcon }[] = [
    { id: 'flat', label: t('equalizerFlat'), icon: SlidersHorizontal },
    { id: 'bass_boost', label: t('equalizerBass'), icon: Volume2 },
    { id: 'phonk', label: t('equalizerPhonk'), icon: Zap },
    { id: 'treble_boost', label: t('equalizerTreble'), icon: Sparkles },
    { id: 'vocal', label: t('equalizerVocal'), icon: Mic },
    { id: 'rock', label: t('equalizerRock'), icon: Radio },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-[74px] items-center gap-4 border-t border-[#222222] bg-[#141414]/95 px-5 backdrop-blur-md select-none">
      {/* Track metadata */}
      <div className="flex w-72 shrink-0 items-center gap-3 overflow-hidden">
        <div
          className="relative h-11 w-11 shrink-0 rounded overflow-hidden bg-[#242424] border border-[#2e2e2e] cursor-pointer group"
          onClick={onTrackTitleClick}
        >
          <img
            src={track.artwork || '/favicon.png'}
            alt={track.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="overflow-hidden flex-1 min-w-0">
          <p
            onClick={onTrackTitleClick}
            className="truncate text-sm font-semibold text-white hover:underline cursor-pointer"
            title={track.title}
          >
            {track.title}
          </p>
          <p
            onClick={() => onArtistClick?.(track.artist)}
            className="truncate text-xs text-[#999999] hover:text-white cursor-pointer hover:underline"
          >
            {track.artist}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onLike}
            className={`p-1.5 rounded-full transition-colors hover:bg-[#222222] ${
              liked ? 'text-[#ff5500]' : 'text-[#888888] hover:text-white'
            }`}
            title={liked ? t('unlike') : t('like')}
          >
            <Heart size={16} fill={liked ? '#ff5500' : 'none'} />
          </button>
          <button
            onClick={onOpenComments}
            className="p-1.5 rounded-full text-[#888888] hover:text-white hover:bg-[#222222] transition-colors"
            title={t('comments')}
          >
            <MessageSquare size={16} />
          </button>
          {onOpenLyrics && (
            <button
              onClick={onOpenLyrics}
              className="p-1.5 rounded-full text-[#888888] hover:text-white hover:bg-[#222222] transition-colors"
              title={t('lyrics')}
            >
              <Mic2 size={16} />
            </button>
          )}
          <button
            onClick={onDownload}
            disabled={downloading}
            className="p-1.5 rounded-full text-[#888888] hover:text-white hover:bg-[#222222] transition-colors disabled:opacity-50"
            title={t('download')}
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin text-[#ff5500]" />
            ) : (
              <Download size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Main playback controls */}
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            onClick={onShuffle}
            className={`transition-colors p-1 rounded-full ${
              shuffle ? 'text-[#ff5500]' : 'text-[#888888] hover:text-white'
            }`}
            title={t('shuffle')}
          >
            <Shuffle size={15} />
          </button>
          <button
            onClick={onPrev}
            className="text-[#888888] hover:text-white transition-colors p-1"
            title={t('previous')}
          >
            <SkipBack size={17} fill="currentColor" />
          </button>
          <button
            onClick={onPlayPause}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff5500] text-white hover:bg-[#ff6600] active:bg-[#e64d00] transition-colors shadow-md shadow-[#ff5500]/20"
            title={isPlaying ? t('pause') : t('play')}
          >
            {isPlaying ? (
              <Pause size={17} fill="white" />
            ) : (
              <Play size={17} fill="white" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={onNext}
            className="text-[#888888] hover:text-white transition-colors p-1"
            title={t('next')}
          >
            <SkipForward size={17} fill="currentColor" />
          </button>
          <button
            onClick={onRepeat}
            className={`transition-colors p-1 rounded-full ${
              repeatMode !== 'off'
                ? 'text-[#ff5500]'
                : 'text-[#888888] hover:text-white'
            }`}
            title={repeatMode === 'one' ? t('repeatOne') : repeatMode === 'all' ? t('repeatAll') : t('repeatOff')}
          >
            {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
          </button>
        </div>

        <div className="flex w-full max-w-2xl items-center gap-2">
          <span className="w-10 text-right text-[11px] tabular-nums text-[#888888]">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1">
            <Waveform
              waveformUrl={track.waveform_url}
              progress={progress}
              height={22}
              interactive
              isPlaying={isPlaying}
              trackId={track.id}
              duration={duration}
              comments={comments}
              onSeek={onSeek}
            />
          </div>
          <span className="w-10 text-[11px] tabular-nums text-[#888888]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Audio FX, speed, sleep timer & volume controls */}
      <div className="flex w-80 shrink-0 items-center justify-end gap-3 relative">
        {/* Equalizer Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setEqOpen(!eqOpen);
              setSpeedOpen(false);
              setTimerOpen(false);
            }}
            className={`p-1.5 rounded transition-colors ${
              currentEq !== 'flat'
                ? 'text-[#ff5500] bg-[#ff5500]/10'
                : 'text-[#888888] hover:text-white hover:bg-[#222222]'
            }`}
            title={t('equalizer')}
          >
            <SlidersHorizontal size={16} />
          </button>

          {eqOpen && (
            <div className="absolute bottom-11 right-0 w-48 rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <p className="text-[11px] font-bold text-white mb-1.5 px-2">{t('equalizerPresets')}</p>
              <div className="space-y-1">
                {eqPresets.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectEq(p.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                        currentEq === p.id
                          ? 'bg-[#ff5500] text-white font-bold'
                          : 'text-[#ccc] hover:bg-[#282828] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={13} className={currentEq === p.id ? 'text-white' : 'text-[#888888]'} />
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Playback Speed Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setSpeedOpen(!speedOpen);
              setEqOpen(false);
              setTimerOpen(false);
            }}
            className={`p-1.5 rounded transition-colors text-xs font-bold ${
              speed !== 1.0
                ? 'text-[#ff5500] bg-[#ff5500]/10'
                : 'text-[#888888] hover:text-white hover:bg-[#222222]'
            }`}
            title={`${t('speed')}: ${speed}x`}
          >
            <span className="flex items-center gap-0.5 font-mono text-[11px]">
              <Gauge size={13} />
              {speed}x
            </span>
          </button>

          {speedOpen && (
            <div className="absolute bottom-11 right-0 w-28 rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-1.5 shadow-2xl z-50">
              <p className="text-[10px] font-bold text-white mb-1 px-1.5 uppercase">{t('speed')}</p>
              <div className="space-y-0.5">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSelectSpeed(s)}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-mono transition-colors ${
                      speed === s
                        ? 'bg-[#ff5500] text-white font-bold'
                        : 'text-[#ccc] hover:bg-[#282828] hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sleep Timer Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setTimerOpen(!timerOpen);
              setEqOpen(false);
              setSpeedOpen(false);
            }}
            className={`p-1.5 rounded transition-colors ${
              sleepTimerSeconds
                ? 'text-emerald-400 bg-emerald-950/40'
                : 'text-[#888888] hover:text-white hover:bg-[#222222]'
            }`}
            title={
              sleepTimerSeconds
                ? `${t('sleepTimer')}: ${Math.floor(sleepTimerSeconds / 60)}${t('minShort')}`
                : t('sleepTimer')
            }
          >
            <Clock size={16} />
          </button>

          {timerOpen && (
            <div className="absolute bottom-11 right-0 w-36 rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-1.5 shadow-2xl z-50">
              <p className="text-[10px] font-bold text-white mb-1 px-1.5 uppercase">{t('sleepTimer')}</p>
              <div className="space-y-0.5">
                {timers.map((timerItem, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectTimer(timerItem.val)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-[#ccc] hover:bg-[#282828] hover:text-white transition-colors"
                  >
                    {timerItem.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={handleToggleMute}
            className="text-[#888888] hover:text-white transition-colors"
            title={volume === 0 ? t('unmute') : t('mute')}
          >
            {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-[#333333] accent-[#ff5500]"
            style={{
              background: `linear-gradient(to right, #ff5500 ${volume}%, #333333 ${volume}%)`,
            }}
          />
        </div>

        {/* Queue panel button */}
        {onToggleQueue && (
          <button
            onClick={onToggleQueue}
            className={`relative p-2 rounded transition-colors ${
              isQueueOpen
                ? 'text-[#ff5500] bg-[#ff5500]/10'
                : 'text-[#888888] hover:text-white hover:bg-[#222222]'
            }`}
            title={t('queue')}
          >
            <ListMusic size={18} />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#ff5500] text-white">
                {queueCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
