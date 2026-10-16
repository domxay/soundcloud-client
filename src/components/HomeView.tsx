import { useState, useEffect } from 'react';
import { Track, Playlist } from '@/types';
import { soundcloudApi } from '@/services/api';
import { Play, Pause, Heart, Download, Sparkles, Flame, Trophy, ListMusic, Loader2, ArrowRight } from 'lucide-react';
import TrackList from './TrackList';

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

const GENRES = ['All', 'Phonk', 'Electronic', 'Hip-Hop', 'Synthwave', 'Rock', 'Lo-Fi'];

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
  const [charts, setCharts] = useState<Track[]>([]);
  const [genreTracks, setGenreTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      soundcloudApi.getTopCharts(),
      soundcloudApi.getGenreTracks('All'),
      soundcloudApi.getUserPlaylists(),
    ]).then(([chartList, gList, pList]) => {
      if (isMounted) {
        setCharts(chartList);
        setGenreTracks(gList);
        setPlaylists(pList);
        setLoading(false);
      }
    });

    const unsub = soundcloudApi.subscribeLikes((trackId, isLiked) => {
      setCharts((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, liked: isLiked } : t))
      );
      setGenreTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, liked: isLiked } : t))
      );
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const handleGenreChange = async (genre: string) => {
    setActiveGenre(genre);
    setGenreLoading(true);
    const tracks = await soundcloudApi.getGenreTracks(genre);
    setGenreTracks(tracks);
    setGenreLoading(false);
  };

  const heroTrack = charts[0] || genreTracks[0];

  return (
    <div className="p-8 max-w-7xl mx-auto pb-32 space-y-12">
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
                <span className="text-xs font-bold text-sc-accent uppercase tracking-wider block mb-1.5">
                  Featured Track
                </span>
                <h1 className="text-2xl md:text-4xl font-black text-white leading-tight truncate">
                  {heroTrack.title}
                </h1>
                <p className="text-sm md:text-base text-sc-text-secondary mt-1 font-medium">
                  {heroTrack.artist} • <span className="text-sc-accent font-semibold">{heroTrack.plays} plays</span>
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
            <h2 className="text-xl font-bold text-white">Charts: Top 50</h2>
            <p className="text-xs text-sc-text-secondary mt-0.5">The most played tracks on SoundCloud this week</p>
          </div>
          <button
            onClick={() => onNavigateTab('Stream')}
            className="text-xs text-sc-accent hover:underline font-semibold flex items-center gap-1"
          >
            Stream all
            <ArrowRight size={13} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sc-text-secondary">
            <Loader2 size={24} className="animate-spin-slow text-sc-accent mr-2" />
            Loading global charts...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {charts.slice(0, 6).map((track, idx) => {
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
            <h2 className="text-xl font-bold text-white">Curated Playlists</h2>
            <p className="text-xs text-sc-text-secondary mt-0.5">Hand-picked mixes and albums</p>
          </div>
          <button
            onClick={() => onNavigateTab('Library')}
            className="text-xs text-sc-accent hover:underline font-semibold flex items-center gap-1"
          >
            View Library
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {playlists.slice(0, 5).map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPlaylist(p)}
              className="group cursor-pointer rounded-sc border border-sc-border bg-sc-surface p-3.5 transition-all hover:border-sc-accent hover:bg-sc-hover hover:-translate-y-1 shadow-lg"
            >
              <div className="relative aspect-square rounded-sc overflow-hidden mb-3 border border-sc-border">
                <img
                  src={p.artwork}
                  alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-sc-accent flex items-center justify-center shadow-xl">
                    <Play size={20} fill="white" className="ml-0.5 text-white" />
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-white truncate">{p.title}</h4>
              <p className="text-xs text-sc-text-secondary truncate mt-0.5">{p.artist}</p>
              <span className="text-[11px] text-sc-accent mt-2 inline-block font-medium">
                {p.tracks.length} tracks
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Explore by Genre</h2>
            <p className="text-xs text-sc-text-secondary mt-0.5">Trending tracks across the community</p>
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
            <Loader2 size={24} className="animate-spin-slow text-sc-accent mr-2" />
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
