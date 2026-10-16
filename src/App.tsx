import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import HomeView from '@/components/HomeView';
import PlaylistHero from '@/components/PlaylistHero';
import TrackList from '@/components/TrackList';
import PlayerBar from '@/components/PlayerBar';
import LoginModal from '@/components/LoginModal';
import DownloadsView from '@/components/DownloadsView';
import ProfileView from '@/components/ProfileView';
import LibraryView from '@/components/LibraryView';
import CommentsModal from '@/components/CommentsModal';
import LyricsModal from '@/components/LyricsModal';
import ThemeSettingsModal from '@/components/ThemeSettingsModal';
import { Track, Playlist, DownloadItem, UserProfile, Comment, ToastNotification } from '@/types';
import { emptyPlaylist } from '@/data';
import { audioService } from '@/services/audio';
import { soundcloudApi } from '@/services/api';
import { downloaderService } from '@/services/downloader';
import { authService } from '@/services/auth';
import { themeService, CustomBackground } from '@/services/theme';
import { Cloud, LogIn, CheckCircle2, Info, AlertCircle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist>(emptyPlaylist);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [playlistLiked, setPlaylistLiked] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [commentTrack, setCommentTrack] = useState<Track | null>(null);
  const [currentTrackComments, setCurrentTrackComments] = useState<Comment[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [customBg, setCustomBg] = useState<CustomBackground>(themeService.getBackground());
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const currentIndex = currentTrack
    ? tracks.findIndex((t) => t.id === currentTrack.id)
    : 0;

  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;
    let nextIndex = 0;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = (currentIndex + 1) % tracks.length;
    }
    const nextTrack = tracks[nextIndex];
    setCurrentTrack(nextTrack);
    setDuration(nextTrack.duration);
    audioService.playTrack(nextTrack);
  }, [shuffle, currentIndex, tracks]);

  const handlePrev = useCallback(() => {
    if (tracks.length === 0) return;
    if (currentTime > 3) {
      audioService.seek(0);
      return;
    }
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    const prevTrack = tracks[prevIndex];
    setCurrentTrack(prevTrack);
    setDuration(prevTrack.duration);
    audioService.playTrack(prevTrack);
  }, [currentIndex, tracks, currentTime]);

  useEffect(() => {
    const unsubAudio = audioService.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTime);
      setProgress(state.progress);
      if (state.duration > 0) {
        setDuration(state.duration);
      }
    });

    const unsubDownloads = downloaderService.subscribe((items) => {
      setDownloads(items);
      const activeIds = new Set(
        items.filter((i) => i.status === 'downloading').map((i) => i.trackId)
      );
      setDownloadingIds(activeIds);
    });

    const unsubTheme = themeService.subscribe(() => {
      setCustomBg(themeService.getBackground());
    });

    const unsubLikes = soundcloudApi.subscribeLikes((trackId, isLiked) => {
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, liked: isLiked } : t))
      );
      setCurrentTrack((prev) =>
        prev && prev.id === trackId ? { ...prev, liked: isLiked } : prev
      );
    });

    audioService.setVolume(volume);

    const savedProxy = localStorage.getItem('sc_proxy_rule');
    if (savedProxy && window.electronAPI?.setProxy) {
      window.electronAPI.setProxy(savedProxy);
    }

    return () => {
      unsubAudio();
      unsubDownloads();
      unsubTheme();
      unsubLikes();
    };
  }, []);

  useEffect(() => {
    if (currentTrack) {
      soundcloudApi.getTrackComments(currentTrack.id).then((cList) => {
        setCurrentTrackComments(cList);
      });
    } else {
      setCurrentTrackComments([]);
    }
  }, [currentTrack]);

  useEffect(() => {
    audioService.setOnEnded(() => {
      handleNext();
    });
    audioService.setRepeat(repeat);
  }, [handleNext, repeat]);

  const loadUserData = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setIsLoginModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const user = await soundcloudApi.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        authService.setUser(user);
      }

      const history = await soundcloudApi.getUserPlayHistory();
      if (history.length > 0) {
        setTracks(history);
        setCurrentTrack(history[0]);
        setDuration(history[0].duration);
        setCurrentPlaylist({
          id: 1,
          title: 'Recently Played Stream',
          artist: user?.username || 'domxay',
          artwork: history[0]?.artwork || emptyPlaylist.artwork,
          updatedDaysAgo: 0,
          tracks: history,
        });
      } else {
        const likes = await soundcloudApi.getUserLikes();
        if (likes.length > 0) {
          setTracks(likes);
          setCurrentTrack(likes[0]);
          setDuration(likes[0].duration);
          setCurrentPlaylist({
            id: 2,
            title: 'Liked Tracks',
            artist: user?.username || 'domxay',
            artwork: likes[0]?.artwork || emptyPlaylist.artwork,
            updatedDaysAgo: 0,
            tracks: likes,
          });
        } else {
          const trending = await soundcloudApi.getTrendingTracks();
          if (trending.length > 0) {
            setTracks(trending);
            setCurrentTrack(trending[0]);
            setDuration(trending[0].duration);
            setCurrentPlaylist({
              id: 3,
              title: 'Discover SoundCloud Top Stream',
              artist: 'SoundCloud Curated',
              artwork: trending[0]?.artwork || emptyPlaylist.artwork,
              updatedDaysAgo: 0,
              tracks: trending,
            });
          }
        }
      }
    } catch {
      setIsLoginModalOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    if (!authService.isAuthenticated()) {
      setIsLoginModalOpen(true);
      return;
    }

    if (tab === 'Profile' || tab === 'Downloads' || tab === 'Library') {
      return;
    }

    setLoading(true);
    try {
      if (tab === 'Likes') {
        const likes = await soundcloudApi.getUserLikes();
        if (likes.length > 0) {
          setTracks(likes);
          setCurrentPlaylist({
            id: 999,
            title: 'My Liked Tracks',
            artist: authService.getSession().user?.username || 'domxay',
            artwork: likes[0]?.artwork || emptyPlaylist.artwork,
            updatedDaysAgo: 0,
            tracks: likes,
          });
        } else {
          const trending = await soundcloudApi.getTrendingTracks();
          setTracks(trending);
          setCurrentPlaylist({
            id: 999,
            title: 'Liked Tracks (Empty - Discover Below)',
            artist: authService.getSession().user?.username || 'domxay',
            artwork: trending[0]?.artwork || emptyPlaylist.artwork,
            updatedDaysAgo: 0,
            tracks: trending,
          });
        }
      } else if (tab === 'Playlists') {
        const playlists = await soundcloudApi.getUserPlaylists();
        if (playlists.length > 0) {
          setCurrentPlaylist(playlists[0]);
          setTracks(playlists[0].tracks);
        }
      } else if (tab === 'Stream') {
        const history = await soundcloudApi.getUserPlayHistory();
        if (history.length > 0) {
          setTracks(history);
          setCurrentPlaylist({
            id: 1,
            title: 'Recently Played Stream',
            artist: authService.getSession().user?.username || 'domxay',
            artwork: history[0]?.artwork || emptyPlaylist.artwork,
            updatedDaysAgo: 0,
            tracks: history,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlaylist = (p: Playlist) => {
    setCurrentPlaylist(p);
    setTracks(p.tracks);
    if (p.tracks.length > 0) {
      setCurrentTrack(p.tracks[0]);
      setDuration(p.tracks[0].duration);
      audioService.playTrack(p.tracks[0]);
    }
    setActiveTab('Stream');
    addToast(`Playing playlist: ${p.title}`, 'info');
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await soundcloudApi.searchTracks(query);
      if (results.length > 0) {
        setTracks(results);
        setCurrentPlaylist({
          id: 888,
          title: `Search: "${query}"`,
          artist: 'SoundCloud',
          artwork: results[0]?.artwork || emptyPlaylist.artwork,
          updatedDaysAgo: 0,
          tracks: results,
        });
        setActiveTab('Stream');
        addToast(`Found ${results.length} tracks for "${query}"`, 'info');
      } else {
        addToast(`No results found for "${query}"`, 'warning');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      audioService.togglePlay();
    } else {
      setCurrentTrack(track);
      setDuration(track.duration);
      audioService.playTrack(track);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setCurrentTrack(tracks[0]);
    setDuration(tracks[0].duration);
    audioService.playTrack(tracks[0]);
  };

  const handleLikeToggle = (id: number) => {
    const isNowLiked = soundcloudApi.toggleLocalLike(id);
    const track = soundcloudApi.getTrack(id);
    const title = track ? track.title : 'Track';
    addToast(isNowLiked ? `Added to Likes: ${title}` : `Removed from Likes: ${title}`, 'success');
  };

  const handleDownload = (id: number) => {
    const track = soundcloudApi.getTrack(id) || tracks.find((t) => t.id === id);
    if (track) {
      downloaderService.downloadTrack(track);
      addToast(`Choose destination to save: ${track.title}`, 'info');
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    addToast(`Preparing ${tracks.length} tracks to download...`, 'info');
    await downloaderService.downloadPlaylist(tracks);
    setIsDownloadingAll(false);
  };

  const handleSeek = (seekProgress: number) => {
    audioService.seek(seekProgress);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    audioService.setVolume(newVolume);
  };

  const handleOpenCommentsModal = (trackToComment?: Track) => {
    const t = trackToComment || currentTrack;
    if (t) {
      setCommentTrack(t);
      setIsCommentsOpen(true);
    }
  };

  const isPlayerDownloading = currentTrack
    ? downloadingIds.has(currentTrack.id)
    : false;

  return (
    <div className="min-h-screen bg-sc-bg text-sc-text-primary flex flex-col relative">
      {customBg.type !== 'none' && customBg.url && (
        <div className="sc-bg-layer">
          {customBg.type === 'video' ? (
            <video
              src={customBg.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ filter: `blur(${customBg.blur}px)` }}
            />
          ) : (
            <img
              src={customBg.url}
              alt="Custom background"
              className="w-full h-full object-cover"
              style={{ filter: `blur(${customBg.blur}px)` }}
            />
          )}
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: customBg.opacity / 100 }}
          />
        </div>
      )}

      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenThemeSettings={() => setIsThemeModalOpen(true)}
        onSearch={handleSearch}
      />

      <main className="mx-auto max-w-[1400px] w-full flex-1 relative z-10">
        {activeTab === 'Home' ? (
          <HomeView
            currentTrackId={currentTrack?.id ?? null}
            isPlaying={isPlaying}
            downloadingIds={downloadingIds}
            onTrackPlay={handleTrackPlay}
            onLikeToggle={handleLikeToggle}
            onDownload={handleDownload}
            onSelectPlaylist={handleSelectPlaylist}
            onOpenComments={handleOpenCommentsModal}
            onNavigateTab={handleTabChange}
          />
        ) : activeTab === 'Library' ? (
          <LibraryView
            currentTrackId={currentTrack?.id ?? null}
            isPlaying={isPlaying}
            downloadingIds={downloadingIds}
            onTrackPlay={handleTrackPlay}
            onLikeToggle={handleLikeToggle}
            onDownload={handleDownload}
            onSelectPlaylist={handleSelectPlaylist}
            onOpenComments={handleOpenCommentsModal}
          />
        ) : activeTab === 'Profile' ? (
          <ProfileView
            user={currentUser}
            currentTrackId={currentTrack?.id ?? null}
            isPlaying={isPlaying}
            downloadingIds={downloadingIds}
            onTrackPlay={handleTrackPlay}
            onLikeToggle={handleLikeToggle}
            onDownload={handleDownload}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        ) : activeTab === 'Downloads' ? (
          <DownloadsView downloads={downloads} />
        ) : !authService.isAuthenticated() && tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 px-4 text-center">
            <Cloud size={64} className="text-sc-accent mb-4" fill="currentColor" />
            <h2 className="text-3xl font-extrabold text-white">Sign In to SoundCloud</h2>
            <p className="text-sm text-sc-text-secondary max-w-md mt-2 mb-6">
              Connect your SoundCloud personal account to play your streams, listen to your playlists, and download any track directly to your PC.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 rounded-sc bg-sc-accent px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-sc-accent-hover shadow-lg shadow-sc-accent/25"
            >
              <LogIn size={18} />
              Connect Account
            </button>
          </div>
        ) : (
          <>
            <PlaylistHero
              playlist={currentPlaylist}
              onPlayAll={handlePlayAll}
              onDownloadAll={handleDownloadAll}
              downloadingAll={isDownloadingAll}
              liked={playlistLiked}
              onLike={() => setPlaylistLiked(!playlistLiked)}
            />

            {loading ? (
              <div className="text-center py-20 text-sc-text-secondary">
                Loading SoundCloud stream...
              </div>
            ) : (
              <TrackList
                tracks={tracks}
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                onTrackPlay={handleTrackPlay}
                onLikeToggle={handleLikeToggle}
                downloadingIds={downloadingIds}
                onDownload={handleDownload}
                onOpenComments={handleOpenCommentsModal}
              />
            )}
          </>
        )}
      </main>

      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        shuffle={shuffle}
        repeat={repeat}
        liked={currentTrack?.liked ?? false}
        downloading={isPlayerDownloading}
        comments={currentTrackComments}
        onPlayPause={() => audioService.togglePlay()}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onVolume={handleVolumeChange}
        onShuffle={() => setShuffle(!shuffle)}
        onRepeat={() => setRepeat(!repeat)}
        onLike={() => currentTrack && handleLikeToggle(currentTrack.id)}
        onDownload={() => currentTrack && handleDownload(currentTrack.id)}
        onOpenDownloads={() => setActiveTab('Downloads')}
        onOpenComments={() => handleOpenCommentsModal()}
        onOpenLyrics={() => setIsLyricsOpen(true)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={loadUserData}
      />

      <CommentsModal
        track={commentTrack}
        currentTime={currentTime}
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        onSeek={(sec) => {
          if (currentTrack && currentTrack.duration > 0) {
            audioService.seek(sec / currentTrack.duration);
          }
        }}
      />

      <LyricsModal
        track={currentTrack}
        currentTime={currentTime}
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        onSeek={(sec) => {
          if (currentTrack && currentTrack.duration > 0) {
            audioService.seek(sec / currentTrack.duration);
          }
        }}
      />

      <ThemeSettingsModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 rounded-sc bg-[#1e1e1e]/95 border border-sc-border px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-semibold text-white pointer-events-auto animate-in slide-in-from-right-4 duration-200"
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : t.type === 'warning' ? (
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
            ) : (
              <Info size={16} className="text-sc-accent shrink-0" />
            )}
            <span className="truncate max-w-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
