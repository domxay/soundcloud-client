import { useState, useEffect, useMemo } from 'react';
import { Playlist, Track } from '@/types';
import { soundcloudApi } from '@/services/api';
import { useI18n } from '@/services/i18n';
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
  const { t } = useI18n();
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

  const deduplicatedPlaylists = useMemo(() => {
    const seenIds = new Set<string | number>();
    const seenTitles = new Set<string>();

    return playlists.filter((p) => {
      if (!p || !p.title) return false;
      const lower = p.title.trim().toLowerCase();
      if (seenIds.has(p.id) || seenTitles.has(lower)) {
        return false;
      }
      seenIds.add(p.id);
      seenTitles.add(lower);
      return true;
    });
  }, [playlists]);

  const filteredPlaylists = useMemo(() => {
    if (activeCategory === 'All') return deduplicatedPlaylists;

    return deduplicatedPlaylists.filter((p) => {
      const title = (p.title || '').toLowerCase();
      const artist = (p.artist || '').toLowerCase();

      if (activeCategory === 'Electronic') {
        return (
          title.includes('edm') ||
          title.includes('dance') ||
          title.includes('electro') ||
          title.includes('techno') ||
          title.includes('bass') ||
          title.includes('phonk') ||
          title.includes('hardtekk') ||
          title.includes('dubstep') ||
          title.includes('house') ||
          title.includes('breakbeat') ||
          title.includes('drum & bass') ||
          title.includes('synthwave') ||
          title.includes('ambient') ||
          artist.includes('electronic') ||
          artist.includes('dance') ||
          artist.includes('edm')
        );
      }
      if (activeCategory === 'Hip-Hop') {
        return (
          title.includes('hip') ||
          title.includes('rap') ||
          title.includes('trap') ||
          title.includes('plugg') ||
          title.includes('bars') ||
          title.includes('r&b') ||
          title.includes('hustle') ||
          artist.includes('rap') ||
          artist.includes('hip-hop') ||
          artist.includes('hustle')
        );
      }
      if (activeCategory === 'Indie & Pop') {
        return (
          title.includes('indie') ||
          title.includes('pop') ||
          title.includes('dreams') ||
          title.includes('scenes') ||
          title.includes('fresco') ||
          title.includes('latin') ||
          title.includes('chill') ||
          title.includes('acoustic') ||
          artist.includes('indie') ||
          artist.includes('pop') ||
          artist.includes('scenes')
        );
      }
      if (activeCategory === 'Rock') {
        return (
          title.includes('rock') ||
          title.includes('metal') ||
          title.includes('punk') ||
          title.includes('alternative') ||
          title.includes('industrial') ||
          artist.includes('rock') ||
          artist.includes('metal')
        );
      }
      if (activeCategory === 'Curated') {
        return (
          title.includes('buzzing') ||
          title.includes('curated') ||
          title.includes('your mix') ||
          title.includes('selected by') ||
          title.includes('picks') ||
          title.includes('lookout') ||
          title.includes('weekly') ||
          title.includes('top') ||
          title.includes('hits') ||
          artist.includes('soundcloud') ||
          artist.includes('curated') ||
          artist.includes('editorial')
        );
      }
      return true;
    });
  }, [deduplicatedPlaylists, activeCategory]);

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
          &larr; {t('backToPlaylists')}
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
              {t('curatedPlaylistBadge')}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {selectedPlaylist.title}
            </h1>
            <p className="text-xs text-sc-text-secondary">
              {t('curatedBy')} <strong className="text-white">{selectedPlaylist.artist}</strong> &bull; {selectedPlaylist.tracks.length} {t('tracksCount')}
            </p>
            {selectedPlaylist.tracks.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => onTrackPlay(selectedPlaylist.tracks[0])}
                  className="inline-flex items-center gap-2 rounded-sc bg-sc-accent px-5 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-lg shadow-sc-accent/25"
                >
                  <Play size={14} fill="white" />
                  {t('playAll')}
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
            <h1 className="text-xl font-bold tracking-tight text-white">{t('playlistsViewTitle')}</h1>
          </div>
          <p className="text-xs text-sc-text-secondary mt-1">
            {t('playlistsViewSubtitle')}
          </p>
        </div>

        <button
          onClick={() => fetchPlaylists(false)}
          disabled={loading}
          className="flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface px-3 py-1.5 text-xs font-semibold text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-sc-accent' : ''} />
          <span>{t('refreshPlaylists')}</span>
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
          <p className="text-xs">{t('loadingLibrary')}</p>
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-center py-20 text-xs text-sc-text-secondary border border-dashed border-sc-border rounded-sc">
          {t('noPlaylistsCategory')}
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
                  title={t('playAll')}
                >
                  <Play size={15} fill="white" className="ml-0.5" />
                </button>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white truncate" title={p.title}>
                  {p.title}
                </h3>
                <p className="text-[11px] text-sc-text-secondary truncate mt-0.5">
                  {p.artist === 'New!' || !p.artist ? 'SoundCloud' : p.artist}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-sc-text-secondary/80">
                  <span>{p.tracks.length > 0 ? `${p.tracks.length} ${t('tracksCount')}` : t('playlists')}</span>
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
