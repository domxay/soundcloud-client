import { Play, Pause, Heart, Download, MoreHorizontal, Loader2, MessageSquare } from 'lucide-react';
import { Track } from '@/types';
import { formatTime, formatRelativeTime } from '@/services/utils';
import Waveform from './Waveform';

interface TrackListProps {
  tracks: Track[];
  currentTrackId: number | null;
  isPlaying: boolean;
  onTrackPlay: (track: Track) => void;
  onLikeToggle: (id: number) => void;
  downloadingIds: Set<number>;
  onDownload: (id: number) => void;
  onOpenComments?: (track: Track) => void;
}

export default function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  onTrackPlay,
  onLikeToggle,
  downloadingIds,
  onDownload,
  onOpenComments,
}: TrackListProps) {
  return (
    <div className="px-8 pb-32">
      <div className="grid grid-cols-[28px_1fr_180px_80px_60px_140px_30px] items-center gap-4 border-b border-sc-border pb-2 text-xs font-semibold uppercase tracking-wider text-sc-text-secondary">
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Artist</span>
        <span className="text-right">Duration</span>
        <span className="text-right">Plays</span>
        <span className="text-center">Actions</span>
        <span></span>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-20 text-sc-text-secondary">
          No tracks found. Try searching or reconnecting your account.
        </div>
      ) : (
        tracks.map((track, index) => {
          const isCurrent = currentTrackId === track.id;
          const isDownloading = downloadingIds.has(track.id);
          const showPlay = isCurrent && isPlaying;

          return (
            <div
              key={track.id}
              className={`group grid grid-cols-[28px_1fr_180px_80px_60px_140px_30px] items-center gap-4 rounded-sc py-2.5 transition-colors hover:bg-[#1f1f1f] ${
                isCurrent ? 'bg-[#1a1a1a]' : ''
              }`}
            >
              <div className="flex items-center justify-center">
                <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-sc-accent' : 'text-sc-text-secondary'}`}>
                  {showPlay ? <Pause size={14} fill="var(--sc-accent)" /> : index + 1}
                </span>
                <button
                  onClick={() => onTrackPlay(track)}
                  className="hidden group-hover:block"
                >
                  <Play size={14} fill="white" className="text-white" />
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative shrink-0">
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="h-10 w-10 rounded-sc object-cover border border-sc-border"
                  />
                  <button
                    onClick={() => onTrackPlay(track)}
                    className="absolute inset-0 hidden items-center justify-center rounded-sc bg-black/60 group-hover:flex"
                  >
                    {showPlay ? (
                      <Pause size={16} fill="white" className="text-white" />
                    ) : (
                      <Play size={16} fill="white" className="text-white" />
                    )}
                  </button>
                </div>
                <div className="overflow-hidden flex-1">
                  <p className={`truncate text-sm font-medium ${isCurrent ? 'text-sc-accent font-semibold' : 'text-white'}`}>
                    {track.title}
                  </p>
                  {(track.created_at || track.display_date) && (
                    <p className="text-[10px] text-sc-text-secondary/70 truncate mt-0.5">
                      Uploaded {formatRelativeTime(track.created_at || track.display_date)}
                    </p>
                  )}
                  <div className="mt-1">
                    <Waveform
                      waveformUrl={track.waveform_url}
                      progress={isCurrent ? 0.35 : 0}
                      height={18}
                      isPlaying={showPlay}
                      trackId={track.id}
                    />
                  </div>
                </div>
              </div>

              <span className="truncate text-sm text-sc-text-secondary hover:text-white hover:underline cursor-pointer">
                {track.artist}
              </span>

              <span className="text-right text-sm text-sc-text-secondary tabular-nums">
                {formatTime(track.duration)}
              </span>

              <span className="text-right text-sm text-sc-text-secondary">
                {track.plays}
              </span>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onLikeToggle(track.id)}
                  className={`transition-colors hover:text-sc-accent ${track.liked ? 'text-sc-accent' : 'text-sc-text-secondary'}`}
                  title="Like"
                >
                  <Heart size={15} fill={track.liked ? 'var(--sc-accent)' : 'none'} />
                </button>
                {onOpenComments && (
                  <button
                    onClick={() => onOpenComments(track)}
                    className="text-sc-text-secondary hover:text-white transition-colors"
                    title="Comments"
                  >
                    <MessageSquare size={15} />
                  </button>
                )}
                <div className="group/dl relative">
                  <button
                    onClick={() => onDownload(track.id)}
                    disabled={isDownloading}
                    className="flex items-center gap-1 rounded-sc border border-sc-border bg-sc-surface px-2 py-1 text-xs font-medium transition-colors hover:border-sc-accent hover:bg-sc-hover disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <Loader2 size={13} className="animate-spin-slow text-sc-accent" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span className="hidden lg:inline">MP3</span>
                  </button>
                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sc bg-sc-hover px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/dl:opacity-100 z-10">
                    Download Free
                  </span>
                </div>
              </div>

              <button className="text-sc-text-secondary opacity-0 transition-opacity hover:text-white group-hover:opacity-100">
                <MoreHorizontal size={16} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
