import { useState, useEffect } from 'react';
import { Playlist, Track } from '@/types';
import { soundcloudApi } from '@/services/api';
import { Play, Download, Heart, Clock, ListMusic, Sparkles, Loader2, ArrowLeft, Music } from 'lucide-react';
import TrackList from './TrackList';

interface LibraryViewProps {
  currentTrackId: number | null;
  isPlaying: boolean;
  downloadingIds: Set<number>;
  onTrackPlay: (track: Track) => void;
  onLikeToggle: (id: number) => void;
  onDownload: (id: number) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenComments?: (track: Track) => void;
}

export default function LibraryView({
  currentTrackId,
  isPlaying,
  downloadingIds,
  onTrackPlay,
  onLikeToggle,
  onDownload,
  onSelectPlaylist,
  onOpenComments,
}: LibraryViewProps) {
  const [tab, setTab] = useState<'overview' | 'playlists' | 'likes' | 'history'>('overview');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likes, setLikes] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [selectedPlaylistView, setSelectedPlaylistView] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadData = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      soundcloudApi.getUserPlaylists(),
      soundcloudApi.getUserLikes(),
      soundcloudApi.getUserPlayHistory(),
      soundcloudApi.getTrendingTracks(),
    ]).then(([pList, lList, hList, tList]) => {
      setPlaylists(pList);
      setLikes(lList);
      setHistory(hList);
      setTrending(tList);
      if (!silent) setLoading(false);
    }).catch(() => {
      if (!silent) setLoading(false);
    });
  };

  useEffect(() => {
    reloadData();
    const unsub = soundcloudApi.subscribeLikes((trackId, isLiked) => {
      setLikes((prev) => {
        if (isLiked) {
          const found = soundcloudApi.getTrack(trackId);
          if (found && !prev.some((t) => t.id === trackId)) {
            return [{ ...found, liked: true }, ...prev];
          }
          return prev.map((t) => (t.id === trackId ? { ...t, liked: true } : t));
        } else {
          return prev.filter((t) => t.id !== trackId);
        }
      });
    });

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') reloadData(true);
    }, 120000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reloadData(true);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsub();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handlePlaylistClick = (p: Playlist) => {
    setSelectedPlaylistView(p);
  };

  const handlePlayEntirePlaylist = (p: Playlist) => {
    if (p.tracks.length > 0) {
      onSelectPlaylist(p);
    }
  };

  if (selectedPlaylistView) {
    return (
      <div className="p-8 max-w-7xl mx-auto pb-32">
        <button
          onClick={() => setSelectedPlaylistView(null)}
          className="flex items-center gap-2 text-xs font-bold text-sc-text-secondary hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Library
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8 border-b border-sc-border pb-8">
          <img
            src={selectedPlaylistView.artwork}
            alt={selectedPlaylistView.title}
            className="w-48 h-48 rounded-sc object-cover border border-sc-border shadow-2xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs uppercase font-extrabold tracking-wider text-sc-accent">
              Playlist
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-white mt-1 mb-2 break-words">
              {selectedPlaylistView.title}
            </h1>
            <p className="text-sm text-sc-text-secondary mb-4">
              Curated by <span className="text-white font-semibold">{selectedPlaylistView.artist}</span> • {selectedPlaylistView.tracks.length} tracks
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePlayEntirePlaylist(selectedPlaylistView)}
                className="flex items-center gap-2 rounded-sc bg-sc-accent px-6 py-2.5 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-lg shadow-sc-accent/25"
              >
                <Play size={16} fill="white" />
                Play All Tracks
              </button>
            </div>
          </div>
        </div>

        <TrackList
          tracks={selectedPlaylistView.tracks}
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
    <div className="p-8 max-w-7xl mx-auto pb-32">
      <div className="border-b border-sc-border pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <ListMusic className="text-sc-accent" size={32} />
          Library
        </h1>
        <p className="text-sm text-sc-text-secondary mt-1">
          Explore your saved collection, featured playlists, liked tracks, and listening history.
        </p>

        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-1.5 rounded-sc text-xs font-semibold transition-all ${
              tab === 'overview'
                ? 'bg-sc-accent text-white shadow-md'
                : 'bg-sc-surface border border-sc-border text-sc-text-secondary hover:text-white hover:bg-sc-hover'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('playlists')}
            className={`px-4 py-1.5 rounded-sc text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tab === 'playlists'
                ? 'bg-sc-accent text-white shadow-md'
                : 'bg-sc-surface border border-sc-border text-sc-text-secondary hover:text-white hover:bg-sc-hover'
            }`}
          >
            <ListMusic size={13} />
            Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setTab('likes')}
            className={`px-4 py-1.5 rounded-sc text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tab === 'likes'
                ? 'bg-sc-accent text-white shadow-md'
                : 'bg-sc-surface border border-sc-border text-sc-text-secondary hover:text-white hover:bg-sc-hover'
            }`}
          >
            <Heart size={13} />
            Liked Tracks ({likes.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-1.5 rounded-sc text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tab === 'history'
                ? 'bg-sc-accent text-white shadow-md'
                : 'bg-sc-surface border border-sc-border text-sc-text-secondary hover:text-white hover:bg-sc-hover'
            }`}
          >
            <Clock size={13} />
            Listening History ({history.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-sc-text-secondary">
          <Loader2 size={32} className="animate-spin-slow text-sc-accent mb-3" />
          <p className="text-sm">Loading your SoundCloud library...</p>
        </div>
      ) : tab === 'playlists' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="text-sc-accent" size={18} />
              Real & Curated Playlists
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlists.map((p) => (
              <div
                key={p.id}
                onClick={() => handlePlaylistClick(p)}
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
        </div>
      ) : tab === 'likes' ? (
        <div>
          {likes.length === 0 ? (
            <div className="space-y-8">
              <div className="text-center py-12 rounded-sc border border-dashed border-sc-border bg-sc-surface p-8">
                <Heart size={44} className="text-sc-accent mb-3 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Liked Tracks Yet</h3>
                <p className="text-xs text-sc-text-secondary max-w-sm mx-auto mt-1 mb-4">
                  Click the heart icon on any track to add it to your personal likes. Discover hot tracks below:
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-sc-accent" />
                  Trending Tracks to Like
                </h3>
                <TrackList
                  tracks={trending}
                  currentTrackId={currentTrackId}
                  isPlaying={isPlaying}
                  onTrackPlay={onTrackPlay}
                  onLikeToggle={onLikeToggle}
                  downloadingIds={downloadingIds}
                  onDownload={onDownload}
                  onOpenComments={onOpenComments}
                />
              </div>
            </div>
          ) : (
            <TrackList
              tracks={likes}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              onTrackPlay={onTrackPlay}
              onLikeToggle={onLikeToggle}
              downloadingIds={downloadingIds}
              onDownload={onDownload}
              onOpenComments={onOpenComments}
            />
          )}
        </div>
      ) : tab === 'history' ? (
        <TrackList
          tracks={history}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onTrackPlay={onTrackPlay}
          onLikeToggle={onLikeToggle}
          downloadingIds={downloadingIds}
          onDownload={onDownload}
          onOpenComments={onOpenComments}
        />
      ) : (
        <div className="space-y-12">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="text-sc-accent" size={18} />
                Featured & Personal Playlists
              </h2>
              <button
                onClick={() => setTab('playlists')}
                className="text-xs text-sc-accent hover:underline font-semibold"
              >
                View all ({playlists.length})
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {playlists.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  onClick={() => handlePlaylistClick(p)}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Heart className="text-sc-accent" size={18} />
                Liked Tracks ({likes.length})
              </h2>
              <button
                onClick={() => setTab('likes')}
                className="text-xs text-sc-accent hover:underline font-semibold"
              >
                View all
              </button>
            </div>

            {likes.length === 0 ? (
              <div className="rounded-sc border border-sc-border bg-sc-surface p-6 text-center">
                <p className="text-sm text-sc-text-secondary">No liked tracks yet. Click the heart icon on any song to save it here.</p>
              </div>
            ) : (
              <TrackList
                tracks={likes.slice(0, 8)}
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
      )}
    </div>
  );
}
