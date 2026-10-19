import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { Track } from '@/types';
import { clsx } from 'clsx';

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  isActive?: boolean;
  onPlay: (track: Track) => void;
  onLike?: (track: Track) => void;
  onArtistClick?: (artist: string) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  isPlaying = false,
  isActive = false,
  onPlay,
  onLike,
  onArtistClick,
}) => {
  return (
    <div className="group relative flex flex-col p-2.5 rounded-lg bg-[#181818] hover:bg-[#222222] transition-colors select-none">
      <div className="relative aspect-square w-full rounded overflow-hidden bg-[#262626] mb-2.5">
        <img
          src={track.artwork || '/favicon.png'}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        <div
          onClick={() => onPlay(track)}
          className={clsx(
            'absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <div className="w-11 h-11 rounded-full bg-[#ff5500] hover:bg-[#ff6600] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
            {isActive && isPlaying ? (
              <Pause size={20} className="text-white fill-white" />
            ) : (
              <Play size={20} className="text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        {onLike && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(track);
            }}
            className={clsx(
              'absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-opacity',
              track.liked
                ? 'opacity-100 text-[#ff5500]'
                : 'opacity-0 group-hover:opacity-100 text-white'
            )}
            title={track.liked ? 'Unlike' : 'Like'}
          >
            <Heart
              size={16}
              className={track.liked ? 'fill-[#ff5500]' : ''}
            />
          </button>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        <span
          onClick={() => onPlay(track)}
          className={clsx(
            'font-semibold text-sm truncate cursor-pointer hover:underline',
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
          className="text-xs text-[#999999] truncate hover:text-white cursor-pointer hover:underline mt-0.5"
        >
          {track.artist}
        </span>
      </div>
    </div>
  );
};
