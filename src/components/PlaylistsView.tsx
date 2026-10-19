import { useState, useEffect } from 'react';
import { Playlist, Track } from '@/types';
import { soundcloudApi } from '@/services/api';
import { Play, ListMusic, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import TrackList from './TrackList';

interface PlaylistsViewProps {
  currentTrackId: number | null;
  isPlaying: boolean;
  downloadingIds: Set<number>;
  onTrackPlay: (track: Track) => void;
  onLikeToggle: (id: number) => void;
  onDownload: (id: number) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenComments?: (track: Track) => void;
}

const CATEGORIES = ['All', 'Curated', 'Electronic', 'Hip-Hop', 'Indie & Pop', 'Rock'];

export default function PlaylistsView({
  currentTrackId,
  isPlaying,
  downloadingIds,
  onTrackPlay,
  onLikeToggle,
  onDownload,
  onSelectPlaylist,
  onOpenComments,
}: PlaylistsViewProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const fetchPlaylists = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await soundcloudApi.getUserPlaylists();
      setPlaylists(list);
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchPlaylists(true);
    }, 90000);
    return () => clearInterval(interval);
  }, []);

  const filteredPlaylists = playlists.filter((p) => {
    if (activeCategory === 'All') return true;
    const title = p.title.toLowerCase();
    const artist = p.artist.toLowerCase();
    if (activeCategory === 'Electronic') {
      return title.includes('electro') || title.includes('techno') || title.includes('edm') || title.includes('dance') || title.includes('phonk') || artist.includes('electronic');
    }
    if (activeCategory === 'Hip-Hop') {
      return title.includes('hip') || title.includes('rap') || title.includes('trap') || title.includes('plugg');
    }
    if (activeCategory === 'Indie & Pop') {
      return title.includes('indie') || title.includes('pop') || title.includes('dreams');
    }
    if (activeCategory === 'Rock') {
      return title.includes('rock') || title.includes('metal') || title.includes('punk');
    }
    if (activeCategory === 'Curated') {
      return title.includes('buzzing') || title.includes('curated') || artist.includes('curated') || artist.includes('new');
    }
    return true;
  });

  const handleOpenPlaylist = async (p: Playlist) => {
    setSelectedPlaylist(p);
    if (p.tracks.length === 0) {
      const detailed = await soundcloudApi.getPlaylistDetails(p.id);
      if (detailed) {
        setSelectedPlaylist(detailed);
        onSelectPlaylist(detailed);
        return;
      }
    }
    onSelectPlaylist(p);
  };

  const handlePlayFirst = async (e: React.MouseEvent, p: Playlist) => {
    e.stopPropagation();
    let target = p;
    if (p.tracks.length === 0) {
      const detailed = await soundcloudApi.getPlaylistDetails(p.id);
      if (detailed) target = detailed;
    }
    onSelectPlaylist(target);
    if (target.tracks.length > 0) {
      onTrackPlay(target.tracks[0]);
    }
  };

  if (selectedPlaylist) {
    return (
      <div className="p-6 space-y-6">
        <button
          onClick={() => setSelectedPlaylist(null)}
          className="flex items-center gap-2 text-xs font-semibold text-sc-text-secondary hover:text-white transition-colors"
        >
          &larr; Back to all playlists
        </button>

        <div className="flex flex-col md:flex-row gap-6 items-center md:items-end rounded-sc border border-sc-border bg-sc-surface p-6">
          {selectedPlaylist.artwork ? (
            <img
              src={selectedPlaylist.artwork}
              alt={selectedPlaylist.title}
              className="h-44 w-44 rounded-sc object-cover border border-sc-border shadow-2xl shrink-0"
            />
          ) : (
            <div className="h-44 w-44 rounded-sc bg-sc-bg border border-sc-border flex items-center justify-center text-sc-text-secondary shrink-0">
              <ListMusic size={48} className="opacity-40" />
            </div>
          )}

          <div className="flex-1 space-y-2 text-center md:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sc-accent">
              Curated Playlist
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {selectedPlaylist.title}
            </h1>
            <p className="text-xs text-sc-text-secondary">
              By <strong className="text-white">{selectedPlaylist.artist}</strong> &bull; {selectedPlaylist.tracks.length} tracks
            </p>
            {selectedPlaylist.tracks.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => onTrackPlay(selectedPlaylist.tracks[0])}
                  className="inline-flex items-center gap-2 rounded-sc bg-sc-accent px-5 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-lg shadow-sc-accent/25"
                >
                  <Play size={14} fill="white" />
                  Play All
                </button>
              </div>
            )}
          </div>
        </div>

        <TrackList
          tracks={selectedPlaylist.tracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onTrackPlay={onTrackPlay}
          onLikeToggle={onLikeToggle}
          downloadingIds={downloadingIds}
          onDownload={onDownload}
          onOpenComments={onOpenComments}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sc-accent">
            <Sparkles size={18} />
            <h1 className="text-xl font-bold tracking-tight text-white">Playlists & Curated Mixes</h1>
          </div>
          <p className="text-xs text-sc-text-secondary mt-1">
            Real-time trending and curated albums from SoundCloud official feeds
          </p>
        </div>

        <button
          onClick={() => fetchPlaylists(false)}
          disabled={loading}
          className="flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface px-3 py-1.5 text-xs font-semibold text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-sc-accent' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-sc px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-sc-accent text-white shadow-md shadow-sc-accent/20'
                : 'bg-sc-surface border border-sc-border text-sc-text-secondary hover:text-white hover:border-sc-accent/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-sc-text-secondary">
          <Loader2 size={32} className="animate-spin text-sc-accent mb-3" />
          <p className="text-xs">Loading SoundCloud playlists...</p>
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-center py-20 text-xs text-sc-text-secondary border border-dashed border-sc-border rounded-sc">
          No playlists found for category "{activeCategory}".
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredPlaylists.map((p) => (
            <div
              key={p.id}
              onClick={() => handleOpenPlaylist(p)}
              className="group cursor-pointer rounded-sc border border-sc-border bg-sc-surface/60 p-3 hover:bg-sc-hover hover:border-sc-accent/40 transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-square w-full rounded-sc overflow-hidden bg-sc-bg mb-2.5 border border-sc-border/60">
                {p.artwork ? (
                  <img
                    src={p.artwork}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sc-text-secondary">
                    <ListMusic size={32} className="opacity-40" />
                  </div>
                )}
                <button
                  onClick={(e) => handlePlayFirst(e, p)}
                  className="absolute bottom-2 right-2 h-9 w-9 rounded-full bg-sc-accent text-white flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-110"
                  title="Play Playlist"
                >
                  <Play size={15} fill="white" className="ml-0.5" />
                </button>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white truncate" title={p.title}>
                  {p.title}
                </h3>
                <p className="text-[11px] text-sc-text-secondary truncate mt-0.5">
                  {p.artist}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-sc-text-secondary/80">
                  <span>{p.tracks.length > 0 ? `${p.tracks.length} tracks` : 'Full Playlist'}</span>
                  <span className="text-sc-accent font-medium">SoundCloud</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
