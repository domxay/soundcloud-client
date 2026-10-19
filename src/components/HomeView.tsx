import { useState, useEffect, useCallback, useRef } from 'react';
import { Track, Playlist } from '@/types';
import { soundcloudApi } from '@/services/api';
import { formatRelativeTime } from '@/services/utils';
import { Play, Pause, Heart, Download, Sparkles, Flame, Trophy, ListMusic, Loader2, ArrowRight, RefreshCw, Radio } from 'lucide-react';
import TrackList from './TrackList';

function mergeNewTracks(existing: Track[], incoming: Track[]): Track[] {
  const incomingMap = new Map(incoming.map((t) => [t.id, t]));
  const existingIds = new Set(existing.map((t) => t.id));
  const newOnes = incoming.filter((t) => !existingIds.has(t.id));
  const updatedExisting = existing.map((t) => {
    const inc = incomingMap.get(t.id);
    return inc ? { ...t, ...inc, liked: t.liked || inc.liked } : t;
  });
  const merged = [...newOnes, ...updatedExisting];
  return merged.slice(0, Math.max(existing.length, incoming.length, 1));
}

interface HomeViewProps {
  currentTrackId: number | null;
  isPlaying: boolean;
  downloadingIds: Set<number>;
  onTrackPlay: (track: Track) => void;
  onLikeToggle: (id: number) => void;
  onDownload: (id: number) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenComments?: (track: Track) => void;
  onNavigateTab: (tab: string) => void;
}

const GENRES = ['All', 'Phonk', 'Electronic', 'Hip-Hop', 'Trap', 'Synthwave', 'Rock', 'Lo-Fi', 'Pop'];

export default function HomeView({
  currentTrackId,
  isPlaying,
  downloadingIds,
  onTrackPlay,
  onLikeToggle,
  onDownload,
  onSelectPlaylist,
  onOpenComments,
  onNavigateTab,
}: HomeViewProps) {
  const [activeGenre, setActiveGenre] = useState('All');
  const activeGenreRef = useRef('All');
  const [charts, setCharts] = useState<Track[]>([]);
  const [genreTracks, setGenreTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const isMountedRef = useRef(true);
  const refreshInFlight = useRef(false);

  const loadData = useCallback(async (initial = false) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (initial) setLoading(true);
    try {
      const genre = activeGenreRef.current;
      const [chartList, gList, pList, nList] = await Promise.all([
        soundcloudApi.getTopCharts(),
        soundcloudApi.getGenreTracks(genre),
        soundcloudApi.getUserPlaylists(),
        soundcloudApi.getNewReleases(),
      ]);
      if (!isMountedRef.current) return;
      setCharts((prev) => (initial || prev.length === 0 ? chartList : mergeNewTracks(prev, chartList)));
      setGenreTracks((prev) => (initial || prev.length === 0 ? gList : mergeNewTracks(prev, gList)));
      setPlaylists(pList);
      setNewReleases(nList);
      setLastUpdated(new Date());
    } catch {
    } finally {
      if (isMountedRef.current) setLoading(false);
      refreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData(true);

    const unsub = soundcloudApi.subscribeLikes((trackId, isLiked) => {
      setCharts((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, liked: isLiked } : t))
      );
      setGenreTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, liked: isLiked } : t))
      );
      setNewReleases((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, liked: isLiked } : t))
      );
    });

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadData(false);
    }, 60000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadData(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMountedRef.current = false;
      unsub();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadData]);

  const handleGenreChange = async (genre: string) => {
    activeGenreRef.current = genre;
    setActiveGenre(genre);
    setGenreLoading(true);
    const tracks = await soundcloudApi.getGenreTracks(genre);
    setGenreTracks(tracks);
    setGenreLoading(false);
  };

  const heroTrack = charts[0] || genreTracks[0];

  return (
    <div className="p-8 max-w-7xl mx-auto pb-32 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sc-border pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Live Stream
          </span>
          <span className="text-xs text-sc-text-secondary">
            &bull; Auto-updating every 60s &bull; Refreshed {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <button
          onClick={() => loadData(false)}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-sc border border-sc-border bg-sc-surface px-3 py-1 text-xs font-semibold text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin text-sc-accent' : ''} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {heroTrack && (
        <div className="relative rounded-sc overflow-hidden border border-sc-border bg-gradient-to-r from-[#1c080e] via-[#140b12] to-[#0a0a0f] p-8 shadow-2xl">
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center filter blur-3xl pointer-events-none"
            style={{ backgroundImage: `url(${heroTrack.artwork})` }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="relative group shrink-0">
                <img
                  src={heroTrack.artwork}
                  alt={heroTrack.title}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-sc object-cover border border-sc-border shadow-2xl"
                />
                <button
                  onClick={() => onTrackPlay(heroTrack)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-sc"
                >
                  <div className="h-14 w-14 rounded-full bg-sc-accent flex items-center justify-center shadow-2xl">
                    {currentTrackId === heroTrack.id && isPlaying ? (
                      <Pause size={24} fill="white" className="text-white" />
                    ) : (
                      <Play size={24} fill="white" className="ml-1 text-white" />
                    )}
                  </div>
                </button>
              </div>

              <div className="max-w-xl">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                  <Flame size={14} className="text-sc-accent" />
                  <span className="text-xs font-bold text-sc-accent uppercase tracking-wider">
                    #1 Trending Global
                  </span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-white leading-tight truncate">
                  {heroTrack.title}
                </h1>
                <p className="text-sm md:text-base text-sc-text-secondary mt-1 font-medium">
                  {heroTrack.artist} &bull; <span className="text-sc-accent font-semibold">{heroTrack.plays} plays</span>
                  {(heroTrack.created_at || heroTrack.display_date) && (
                    <span className="text-sc-text-secondary/70"> &bull; Uploaded {formatRelativeTime(heroTrack.created_at || heroTrack.display_date)}</span>
                  )}
                </p>

                <div className="flex items-center justify-center md:justify-start gap-3 mt-6">
                  <button
                    onClick={() => onTrackPlay(heroTrack)}
                    className="flex items-center gap-2 rounded-sc bg-sc-accent px-6 py-2.5 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-lg shadow-sc-accent/25"
                  >
                    {currentTrackId === heroTrack.id && isPlaying ? (
                      <>
                        <Pause size={16} fill="white" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play size={16} fill="white" />
                        Play
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onLikeToggle(heroTrack.id)}
                    className={`flex items-center gap-1.5 rounded-sc border border-sc-border bg-sc-surface px-4 py-2.5 text-xs font-semibold transition-colors hover:border-sc-accent ${
                      heroTrack.liked ? 'text-sc-accent' : 'text-white'
                    }`}
                  >
                    <Heart size={15} fill={heroTrack.liked ? 'var(--sc-accent)' : 'none'} />
                    {heroTrack.liked ? 'Liked' : 'Like'}
                  </button>

                  <button
                    onClick={() => onDownload(heroTrack.id)}
                    className="flex items-center gap-1.5 rounded-sc border border-sc-border bg-sc-surface px-4 py-2.5 text-xs font-semibold text-white hover:bg-sc-hover transition-colors"
                  >
                    <Download size={15} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sc-accent">
              <Trophy size={18} />
              <h2 className="text-xl font-bold text-white">Charts: Top 50 Trending</h2>
            </div>
            <p className="text-xs text-sc-text-secondary mt-0.5">Real-time hottest tracks updated live from SoundCloud</p>
          </div>
          <button
            onClick={() => onNavigateTab('Stream')}
            className="text-xs text-sc-accent hover:underline font-semibold flex items-center gap-1"
          >
            Stream all 50
            <ArrowRight size={13} />
          </button>
        </div>

        {loading && charts.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sc-text-secondary">
            <Loader2 size={24} className="animate-spin text-sc-accent mr-2" />
            Loading live charts...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {charts.slice(0, 12).map((track, idx) => {
              const isCurrent = currentTrackId === track.id;
              const showPlay = isCurrent && isPlaying;
              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 rounded-sc border border-sc-border bg-sc-surface p-2.5 transition-all hover:border-sc-accent hover:bg-sc-hover ${
                    isCurrent ? 'border-sc-accent bg-[#1a1a1a]' : ''
                  }`}
                >
                  <span className={`w-5 text-center text-xs font-black ${idx < 3 ? 'text-sc-accent' : 'text-sc-text-secondary'}`}>
                    {idx + 1}
                  </span>

                  <div className="relative group/cover shrink-0">
                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="w-12 h-12 rounded-sc object-cover border border-sc-border"
                      loading="lazy"
                    />
                    <button
                      onClick={() => onTrackPlay(track)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center rounded-sc"
                    >
                      {showPlay ? (
                        <Pause size={16} fill="white" className="text-white" />
                      ) : (
                        <Play size={16} fill="white" className="ml-0.5 text-white" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-sc-accent' : 'text-white'}`}>
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-sc-text-secondary truncate mt-0.5">{track.artist}</p>
                    <span className="text-[10px] text-sc-accent font-semibold">{track.plays} plays</span>
                  </div>

                  <button
                    onClick={() => onLikeToggle(track.id)}
                    className={`p-1.5 transition-colors hover:text-sc-accent ${track.liked ? 'text-sc-accent' : 'text-sc-text-secondary'}`}
                  >
                    <Heart size={15} fill={track.liked ? 'var(--sc-accent)' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sc-accent">
              <Sparkles size={18} />
              <h2 className="text-xl font-bold text-white">Curated Playlists & Mixes</h2>
            </div>
            <p className="text-xs text-sc-text-secondary mt-0.5">Official mixed selections curated by SoundCloud editors</p>
          </div>
          <button
            onClick={() => onNavigateTab('Playlists')}
            className="text-xs text-sc-accent hover:underline font-semibold flex items-center gap-1"
          >
            View all ({playlists.length})
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {playlists.slice(0, 6).map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPlaylist(p)}
              className="group cursor-pointer rounded-sc border border-sc-border bg-sc-surface p-3 transition-all hover:border-sc-accent hover:bg-sc-hover hover:-translate-y-1 shadow-lg flex flex-col justify-between"
            >
              <div className="relative aspect-square rounded-sc overflow-hidden mb-2.5 border border-sc-border bg-sc-bg">
                {p.artwork ? (
                  <img
                    src={p.artwork}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sc-text-secondary">
                    <ListMusic size={32} className="opacity-40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-sc-accent flex items-center justify-center shadow-xl">
                    <Play size={16} fill="white" className="ml-0.5 text-white" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white truncate" title={p.title}>{p.title}</h4>
                <p className="text-[11px] text-sc-text-secondary truncate mt-0.5">{p.artist}</p>
                <span className="text-[10px] text-sc-accent mt-1 inline-block font-medium">
                  {p.tracks.length > 0 ? `${p.tracks.length} tracks` : 'Curated'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {newReleases.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-sc-accent">
                <Radio size={18} />
                <h2 className="text-xl font-bold text-white">Fresh Releases & Buzzing Now</h2>
              </div>
              <p className="text-xs text-sc-text-secondary mt-0.5">Newly uploaded tracks making waves right now</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {newReleases.slice(0, 6).map((track) => {
              const isCurrent = currentTrackId === track.id;
              const showPlay = isCurrent && isPlaying;
              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 rounded-sc border border-sc-border bg-sc-surface p-2.5 transition-all hover:border-sc-accent hover:bg-sc-hover ${
                    isCurrent ? 'border-sc-accent bg-[#1a1a1a]' : ''
                  }`}
                >
                  <div className="relative group/cover shrink-0">
                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="w-12 h-12 rounded-sc object-cover border border-sc-border"
                      loading="lazy"
                    />
                    <button
                      onClick={() => onTrackPlay(track)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center rounded-sc"
                    >
                      {showPlay ? (
                        <Pause size={16} fill="white" className="text-white" />
                      ) : (
                        <Play size={16} fill="white" className="ml-0.5 text-white" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-sc-accent' : 'text-white'}`}>
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-sc-text-secondary truncate mt-0.5">{track.artist}</p>
                    <span className="text-[10px] text-emerald-400 font-semibold">New Release</span>
                  </div>

                  <button
                    onClick={() => onLikeToggle(track.id)}
                    className={`p-1.5 transition-colors hover:text-sc-accent ${track.liked ? 'text-sc-accent' : 'text-sc-text-secondary'}`}
                  >
                    <Heart size={15} fill={track.liked ? 'var(--sc-accent)' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Explore by Genre</h2>
            <p className="text-xs text-sc-text-secondary mt-0.5">Top community tracks categorized by genre</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  activeGenre === g
                    ? 'bg-sc-accent text-white shadow-md'
                    : 'bg-sc-surface border border-sc-border text-sc-text-secondary hover:text-white hover:bg-sc-hover'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {genreLoading ? (
          <div className="flex items-center justify-center py-20 text-sc-text-secondary">
            <Loader2 size={24} className="animate-spin text-sc-accent mr-2" />
            Loading {activeGenre} hits...
          </div>
        ) : (
          <TrackList
            tracks={genreTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onTrackPlay={onTrackPlay}
            onLikeToggle={onLikeToggle}
            downloadingIds={downloadingIds}
            onDownload={onDownload}
            onOpenComments={onOpenComments}
          />
        )}
      </section>
    </div>
  );
}
