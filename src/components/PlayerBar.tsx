import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Heart, Download, Volume2, ListMusic, Loader2, MessageSquare, Mic2,
} from 'lucide-react';
import { Track, Comment } from '@/types';
import { formatTime } from '@/services/utils';
import Waveform from './Waveform';

interface PlayerBarProps {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
  liked: boolean;
  downloading: boolean;
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
  onOpenDownloads?: () => void;
  onOpenComments?: () => void;
  onOpenLyrics?: () => void;
}

export default function PlayerBar({
  track, isPlaying, progress, currentTime, duration, volume,
  shuffle, repeat, liked, downloading, comments = [],
  onPlayPause, onPrev, onNext, onSeek, onVolume, onShuffle, onRepeat, onLike, onDownload,
  onOpenDownloads,
  onOpenComments,
  onOpenLyrics,
}: PlayerBarProps) {
  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-20 items-center gap-4 border-t border-sc-border bg-[#141414]/95 px-6 backdrop-blur-md">
      <div className="flex w-64 shrink-0 items-center gap-3 overflow-hidden">
        <img src={track.artwork} alt={track.title} className="h-12 w-12 shrink-0 rounded-sc object-cover border border-sc-border" />
        <div className="overflow-hidden flex-1">
          <p className="truncate text-sm font-medium text-white">{track.title}</p>
          <p className="truncate text-xs text-sc-text-secondary">{track.artist}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-1">
          <button onClick={onLike} className={`transition-colors hover:text-sc-accent ${liked ? 'text-sc-accent' : 'text-sc-text-secondary'}`} title="Like">
            <Heart size={16} fill={liked ? 'var(--sc-accent)' : 'none'} />
          </button>
          <button onClick={onOpenComments} className="text-sc-text-secondary transition-colors hover:text-sc-accent" title="Comments">
            <MessageSquare size={16} />
          </button>
          {onOpenLyrics && (
            <button onClick={onOpenLyrics} className="text-sc-text-secondary transition-colors hover:text-sc-accent" title="Lyrics (LRCLIB)">
              <Mic2 size={16} />
            </button>
          )}
          <button onClick={onDownload} disabled={downloading} className="text-sc-text-secondary transition-colors hover:text-sc-accent disabled:opacity-60" title="Download">
            {downloading ? <Loader2 size={16} className="animate-spin-slow text-sc-accent" /> : <Download size={16} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1.5">
        <div className="flex items-center gap-4">
          <button onClick={onShuffle} className={`transition-colors ${shuffle ? 'text-sc-accent' : 'text-sc-text-secondary hover:text-white'}`} title="Shuffle">
            <Shuffle size={15} />
          </button>
          <button onClick={onPrev} className="text-sc-text-secondary transition-colors hover:text-white" title="Previous">
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            onClick={onPlayPause}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sc-accent text-white transition-colors hover:bg-sc-accent-hover shadow-md shadow-sc-accent/30"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={17} fill="white" /> : <Play size={17} fill="white" className="ml-0.5" />}
          </button>
          <button onClick={onNext} className="text-sc-text-secondary transition-colors hover:text-white" title="Next">
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button onClick={onRepeat} className={`transition-colors ${repeat ? 'text-sc-accent' : 'text-sc-text-secondary hover:text-white'}`} title="Repeat">
            <Repeat size={15} />
          </button>
        </div>

        <div className="flex w-full max-w-2xl items-center gap-2">
          <span className="w-10 text-right text-[11px] tabular-nums text-sc-text-secondary">{formatTime(currentTime)}</span>
          <div className="flex-1">
            <Waveform
              waveformUrl={track.waveform_url}
              progress={progress}
              height={26}
              interactive
              isPlaying={isPlaying}
              trackId={track.id}
              duration={duration}
              comments={comments}
              onSeek={onSeek}
            />
          </div>
          <span className="w-10 text-[11px] tabular-nums text-sc-text-secondary">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex w-64 shrink-0 items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Volume2 size={18} className="text-sc-text-secondary" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-sc-border accent-sc-accent"
            style={{
              background: `linear-gradient(to right, var(--sc-accent) ${volume}%, #333333 ${volume}%)`,
            }}
          />
        </div>
        <button onClick={onOpenDownloads} className="text-sc-text-secondary transition-colors hover:text-white" title="Downloads">
          <ListMusic size={18} />
        </button>
      </div>
    </div>
  );
}
