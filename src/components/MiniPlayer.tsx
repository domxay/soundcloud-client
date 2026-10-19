import React from 'react';
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
} from 'lucide-react';
import { Track, Comment } from '@/types';
import { formatTime } from '@/services/utils';
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
  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-[72px] items-center gap-4 border-t border-[#222222] bg-[#141414]/95 px-5 backdrop-blur-md select-none">
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
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart size={16} fill={liked ? '#ff5500' : 'none'} />
          </button>
          <button
            onClick={onOpenComments}
            className="p-1.5 rounded-full text-[#888888] hover:text-white hover:bg-[#222222] transition-colors"
            title="Comments"
          >
            <MessageSquare size={16} />
          </button>
          {onOpenLyrics && (
            <button
              onClick={onOpenLyrics}
              className="p-1.5 rounded-full text-[#888888] hover:text-white hover:bg-[#222222] transition-colors"
              title="Lyrics"
            >
              <Mic2 size={16} />
            </button>
          )}
          <button
            onClick={onDownload}
            disabled={downloading}
            className="p-1.5 rounded-full text-[#888888] hover:text-white hover:bg-[#222222] transition-colors disabled:opacity-50"
            title="Download track"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin text-[#ff5500]" />
            ) : (
              <Download size={16} />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            onClick={onShuffle}
            className={`transition-colors p-1 rounded-full ${
              shuffle ? 'text-[#ff5500]' : 'text-[#888888] hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle size={15} />
          </button>
          <button
            onClick={onPrev}
            className="text-[#888888] hover:text-white transition-colors p-1"
            title="Previous"
          >
            <SkipBack size={17} fill="currentColor" />
          </button>
          <button
            onClick={onPlayPause}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff5500] text-white hover:bg-[#ff6600] active:bg-[#e64d00] transition-colors shadow-md shadow-[#ff5500]/20"
            title={isPlaying ? 'Pause' : 'Play'}
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
            title="Next"
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
            title={`Repeat: ${repeatMode}`}
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

      <div className="flex w-72 shrink-0 items-center justify-end gap-4">
        <div className="flex items-center gap-2 group">
          <button
            onClick={() => onVolume(volume === 0 ? 80 : 0)}
            className="text-[#888888] hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[#333333] accent-[#ff5500]"
            style={{
              background: `linear-gradient(to right, #ff5500 ${volume}%, #333333 ${volume}%)`,
            }}
          />
        </div>

        {onToggleQueue && (
          <button
            onClick={onToggleQueue}
            className={`relative p-2 rounded transition-colors ${
              isQueueOpen
                ? 'text-[#ff5500] bg-[#ff5500]/10'
                : 'text-[#888888] hover:text-white hover:bg-[#222222]'
            }`}
            title="Next up queue"
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
