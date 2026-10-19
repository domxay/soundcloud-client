import React from 'react';
import { Play, Pause, Heart, MoreHorizontal, Download } from 'lucide-react';
import { Track } from '@/types';
import { IconButton } from './IconButton';
import { clsx } from 'clsx';

interface TrackRowProps {
  track: Track;
  index?: number;
  isPlaying?: boolean;
  isActive?: boolean;
  onPlay: (track: Track) => void;
  onLike?: (track: Track) => void;
  onDownload?: (track: Track) => void;
  onMore?: (track: Track) => void;
  onArtistClick?: (artist: string) => void;
  showIndex?: boolean;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isPlaying = false,
  isActive = false,
  onPlay,
  onLike,
  onDownload,
  onMore,
  onArtistClick,
  showIndex = false,
}) => {
  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={clsx(
        'group flex items-center gap-3 px-3 py-2 rounded-md transition-colors select-none text-sm',
        isActive
          ? 'bg-[#1e1e1e] border-l-2 border-[#ff5500]'
          : 'hover:bg-[#1a1a1a]'
      )}
    >
      {showIndex && typeof index === 'number' && (
        <span className="w-5 text-center text-xs text-[#666666] font-mono group-hover:hidden">
          {index + 1}
        </span>
      )}

      <div
        className="relative w-10 h-10 rounded shrink-0 overflow-hidden cursor-pointer bg-[#222222]"
        onClick={() => onPlay(track)}
      >
        <img
          src={track.artwork || '/favicon.png'}
          alt={track.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div
          className={clsx(
            'absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          {isActive && isPlaying ? (
            <Pause size={18} className="text-white fill-white" />
          ) : (
            <Play size={18} className="text-white fill-white ml-0.5" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span
          onClick={() => onPlay(track)}
          className={clsx(
            'font-medium truncate cursor-pointer hover:underline',
            isActive ? 'text-[#ff5500]' : 'text-white'
          )}
          title={track.title}
        >
          {track.title}
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onArtistClick?.(track.artist);
          }}
          className="text-xs text-[#999999] truncate hover:text-white cursor-pointer hover:underline"
        >
          {track.artist}
        </span>
      </div>

      {track.plays && (
        <span className="text-xs text-[#666666] shrink-0 hidden md:inline">
          ▶ {track.plays}
        </span>
      )}

      <span className="text-xs text-[#777777] shrink-0 font-mono w-12 text-right">
        {formatDuration(track.duration)}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onLike && (
          <IconButton
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLike(track);
            }}
            active={track.liked}
            title={track.liked ? 'Unlike' : 'Like'}
          >
            <Heart
              size={15}
              className={track.liked ? 'fill-[#ff5500] text-[#ff5500]' : ''}
            />
          </IconButton>
        )}
        {onDownload && (
          <IconButton
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(track);
            }}
            title="Download track"
          >
            <Download size={15} />
          </IconButton>
        )}
        {onMore && (
          <IconButton
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onMore(track);
            }}
            title="More actions"
          >
            <MoreHorizontal size={15} />
          </IconButton>
        )}
      </div>
    </div>
  );
};
