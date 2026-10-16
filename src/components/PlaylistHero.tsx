import { Play, Download, Heart, Share2, Music2, Loader2 } from 'lucide-react';
import { Playlist } from '@/types';

interface PlaylistHeroProps {
  playlist: Playlist;
  onPlayAll: () => void;
  onDownloadAll: () => void;
  downloadingAll?: boolean;
  liked: boolean;
  onLike: () => void;
}

export default function PlaylistHero({
  playlist,
  onPlayAll,
  onDownloadAll,
  downloadingAll = false,
  liked,
  onLike,
}: PlaylistHeroProps) {
  const totalSeconds = playlist.tracks.reduce((acc, t) => acc + t.duration, 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const durationText = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8">
      <div className="relative shrink-0 mx-auto md:mx-0">
        <img
          src={playlist.artwork}
          alt={playlist.title}
          className="h-52 w-52 rounded-sc object-cover shadow-2xl shadow-black/70 border border-sc-border"
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-sc bg-black/40 opacity-0 transition-opacity hover:opacity-100">
          <Music2 size={48} className="text-white/80" />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-3 text-center md:text-left">
        <span className="text-xs font-bold tracking-widest text-sc-text-secondary uppercase">PLAYLIST</span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{playlist.title}</h1>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-sc-text-secondary">
          <span className="font-semibold text-sc-accent hover:underline cursor-pointer">{playlist.artist}</span>
          <span>•</span>
          <span>Updated {playlist.updatedDaysAgo} days ago</span>
          <span>•</span>
          <span>{playlist.tracks.length} tracks</span>
          <span>•</span>
          <span>{durationText}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
          <button
            onClick={onPlayAll}
            className="flex items-center gap-2 rounded-sc bg-sc-accent px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sc-accent-hover shadow-lg shadow-sc-accent/20"
          >
            <Play size={18} fill="white" />
            Play All
          </button>
          <button
            onClick={onDownloadAll}
            disabled={downloadingAll}
            className="flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-sc-hover disabled:opacity-50"
          >
            {downloadingAll ? <Loader2 size={16} className="animate-spin-slow text-sc-accent" /> : <Download size={16} />}
            Download Playlist (Free)
          </button>
          <button
            onClick={onLike}
            className={`flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-sc-hover ${
              liked ? 'text-sc-accent' : 'text-white'
            }`}
          >
            <Heart size={16} fill={liked ? '#ff5500' : 'none'} />
            Like
          </button>
          <button className="flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-sc-hover">
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
