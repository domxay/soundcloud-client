import { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import HomeView from '@/components/HomeView';
import PlaylistHero from '@/components/PlaylistHero';
import TrackList from '@/components/TrackList';
import { MiniPlayer } from '@/components/MiniPlayer';
import { QueuePanel } from '@/components/QueuePanel';
import LoginModal from '@/components/LoginModal';
import DownloadsView from '@/components/DownloadsView';
import ProfileView from '@/components/ProfileView';
import LibraryView from '@/components/LibraryView';
import PlaylistsView from '@/components/PlaylistsView';
import CommentsModal from '@/components/CommentsModal';
import LyricsModal from '@/components/LyricsModal';
import ThemeSettingsModal from '@/components/ThemeSettingsModal';
import DesktopOverlay from '@/components/DesktopOverlay';
import { FeedView, SearchResultsView, SettingsView, TrackPageView, ArtistView } from '@/views';
import { Track, Playlist, DownloadItem, UserProfile, Comment, ToastNotification, OverlayState, LyricsData } from '@/types';
import { emptyPlaylist } from '@/data';
import { audioService } from '@/services/audio';
import { soundcloudApi } from '@/services/api';
import { downloaderService } from '@/services/downloader';
import { authService } from '@/services/auth';
import { themeService, CustomBackground } from '@/services/theme';
import { queueService } from '@/services/queue';
import { lyricsService } from '@/services/lyrics';
import { useI18n } from '@/services/i18n';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

function AppContent() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist>(emptyPlaylist);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [speed, setSpeed] = useState(1.0);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
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
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [customBg, setCustomBg] = useState<CustomBackground>(themeService.getBackground());
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [currentLyricsData, setCurrentLyricsData] = useState<LyricsData | null>(null);

  const addToast = (
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Auth gate check on startup: require account authorization
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setIsLoginModalOpen(true);
    }
  }, []);

  // Fetch track lyrics in real time for desktop overlay and lyrics player
  useEffect(() => {
    if (!currentTrack) {
      setCurrentLyricsData(null);
      return;
    }
    let isCurrent = true;
    lyricsService
      .fetchLyrics(
        currentTrack.title,
        currentTrack.artist,
        currentTrack.id,
        currentTrack.description,
        currentTrack.duration
      )
      .then((data) => {
        if (isCurrent) setCurrentLyricsData(data);
      });
    return () => {
      isCurrent = false;
    };
  }, [currentTrack]);

  // Compute active lyrics line for synchronization
  const activeLyricInfo = useMemo(() => {
    if (!currentLyricsData?.lines || currentLyricsData.lines.length === 0) {
      return { activeLyric: '', nextLyric: '' };
    }
    const offset = 0.45;
    const t = currentTime + offset;
    let activeIdx = -1;
    for (let i = 0; i < currentLyricsData.lines.length; i++) {
      if (t >= currentLyricsData.lines[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    if (activeIdx >= 0) {
      return {
        activeLyric: currentLyricsData.lines[activeIdx].text,
        nextLyric: currentLyricsData.lines[activeIdx + 1]?.text || '',
      };
    }
    return {
      activeLyric: '',
      nextLyric: currentLyricsData.lines[0]?.text || '',
    };
  }, [currentLyricsData, currentTime]);

  const handleNext = useCallback((forceSkipRepeat = true) => {
    let nextTrack = queueService.next(forceSkipRepeat);
    if (!nextTrack && tracks.length > 0) {
      const currentId = currentTrack?.id;
      const curIdx = tracks.findIndex((t) => t.id === currentId);
      if (curIdx !== -1 && curIdx + 1 < tracks.length) {
        nextTrack = tracks[curIdx + 1];
        queueService.play(nextTrack, tracks);
      } else if (repeatMode === 'all' || tracks.length > 1) {
        nextTrack = tracks[0];
        queueService.play(nextTrack, tracks);
      }
    }
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      setDuration(nextTrack.duration || 0);
      setProgress(0);
      setCurrentTime(0);
      audioService.playTrack(nextTrack);
    }
  }, [currentTrack, tracks, repeatMode]);

  const handlePrev = useCallback(() => {
    if (currentTime > 3) {
      audioService.seek(0);
      return;
    }
    let prevTrack = queueService.prev(true);
    if (!prevTrack && tracks.length > 0) {
      const currentId = currentTrack?.id;
      const curIdx = tracks.findIndex((t) => t.id === currentId);
      if (curIdx > 0) {
        prevTrack = tracks[curIdx - 1];
        queueService.play(prevTrack, tracks);
      } else if (repeatMode === 'all') {
        prevTrack = tracks[tracks.length - 1];
        queueService.play(prevTrack, tracks);
      }
    }
    if (prevTrack) {
      setCurrentTrack(prevTrack);
      setDuration(prevTrack.duration || 0);
      setProgress(0);
      setCurrentTime(0);
      audioService.playTrack(prevTrack);
    }
  }, [currentTime, currentTrack, tracks, repeatMode]);

  // Sync state to floating desktop overlay
  useEffect(() => {
    const overlayState: OverlayState = {
      track: currentTrack,
      isPlaying,
      progress,
      currentTime,
      duration,
      activeLyric: activeLyricInfo.activeLyric,
      nextLyric: activeLyricInfo.nextLyric,
      themeAccent: themeService.getTheme()?.colors?.accent || '#ff5500',
    };

    if (window.electronAPI?.sendOverlayState) {
      window.electronAPI.sendOverlayState(overlayState);
    }
    try {
      const bc = new BroadcastChannel('sc_overlay_channel');
      bc.postMessage({ type: 'state', payload: overlayState });
      bc.close();
    } catch {}
  }, [currentTrack, isPlaying, progress, currentTime, duration, activeLyricInfo]);

  // Handle incoming commands from Desktop Floating Overlay
  useEffect(() => {
    let lastCmdAction = '';
    let lastCmdTime = 0;

    const handleOverlayCommand = (cmd: { action: string; payload?: any }) => {
      if (!cmd) return;
      const now = Date.now();
      if (cmd.action === lastCmdAction && now - lastCmdTime < 200) {
        return;
      }
      lastCmdAction = cmd.action;
      lastCmdTime = now;

      switch (cmd.action) {
        case 'play-pause':
          if (!authService.isAuthenticated()) {
            setIsLoginModalOpen(true);
            addToast(t('authRequired'), 'error');
            return;
          }
          if (currentTrack) {
            audioService.togglePlay();
          } else if (tracks.length > 0) {
            handleTrackPlay(tracks[0]);
          }
          break;
        case 'next':
          handleNext(true);
          break;
        case 'prev':
          handlePrev();
          break;
        case 'seek':
          if (typeof cmd.payload === 'number') {
            let ratio = cmd.payload;
            if (ratio > 1 && currentTrack?.duration) {
              ratio = ratio / currentTrack.duration;
            }
            const clamped = Math.max(0, Math.min(1, ratio));
            audioService.seek(clamped);
            setProgress(clamped);
          }
          break;
      }
    };

    let unsub: (() => void) | undefined;
    if (window.electronAPI?.onOverlayCommand) {
      unsub = window.electronAPI.onOverlayCommand(handleOverlayCommand);
    }

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('sc_overlay_channel');
      bc.onmessage = (e) => {
        if (e.data?.type === 'action') {
          handleOverlayCommand({ action: e.data.action, payload: e.data.payload });
        }
      };
    } catch {}

    return () => {
      if (unsub) unsub();
      if (bc) bc.close();
    };
  }, [currentTrack, tracks, handleNext, handlePrev]);

  // Global hotkeys: Space, Left/Right, Up/Down, M, L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!authService.isAuthenticated()) {
          setIsLoginModalOpen(true);
          addToast(t('authRequired'), 'error');
          return;
        }
        audioService.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        audioService.seekBy(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        audioService.seekBy(5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.min(100, v + 5);
          audioService.setVolume(nv);
          return nv;
        });
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.max(0, v - 5);
          audioService.setVolume(nv);
          return nv;
        });
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
        const nextVol = audioService.toggleMute();
        setVolume(nextVol);
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'д' || e.key === 'Д') {
        if (currentTrack) {
          handleLikeToggle(currentTrack.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack]);

  useEffect(() => {
    const unsubAudio = audioService.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTime);
      setProgress(state.progress);
      setSpeed(state.speed);
      setSleepTimerSeconds(state.sleepTimerSeconds);
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

    const initProxy = async () => {
      const savedProxy = localStorage.getItem('sc_proxy_rule');
      if (savedProxy && (window as any).electronAPI?.setProxy) {
        await (window as any).electronAPI.setProxy(savedProxy);
      } else if ((window as any).electronAPI?.detectLocalProxy) {
        const detected = await (window as any).electronAPI.detectLocalProxy();
        if (detected.success && detected.proxy) {
          await (window as any).electronAPI.setProxy(detected.proxy);
          localStorage.setItem('sc_proxy_rule', detected.proxy);
        }
      }
    };
    initProxy();

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
      if (repeatMode === 'one') {
        if (currentTrack) {
          audioService.seek(0);
          audioService.togglePlay();
        }
      } else {
        handleNext(false);
      }
    });
    audioService.setRepeat(repeatMode === 'one');
  }, [handleNext, repeatMode, currentTrack]);

  const loadUserData = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const user = await soundcloudApi.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        authService.setUser(user);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleTrackPlay = (track: Track, list?: Track[]) => {
    if (!authService.isAuthenticated()) {
      setIsLoginModalOpen(true);
      addToast(t('authRequired'), 'error');
      return;
    }

    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioService.togglePlay();
      } else {
        if (currentTime >= (duration - 0.5) || duration === 0) {
          audioService.playTrack(track, true);
        } else {
          audioService.togglePlay();
        }
      }
    } else {
      const effectiveList = list && list.length > 0 ? list : tracks.length > 0 ? tracks : [track];
      setTracks(effectiveList);
      queueService.play(track, effectiveList);
      setCurrentTrack(track);
      setDuration(track.duration || 0);
      setProgress(0);
      setCurrentTime(0);
      audioService.playTrack(track);
    }
  };

  const handleSelectPlaylist = (p: Playlist) => {
    if (!authService.isAuthenticated()) {
      setIsLoginModalOpen(true);
      addToast(t('authRequired'), 'error');
      return;
    }

    setCurrentPlaylist(p);
    setTracks(p.tracks);
    if (p.tracks.length > 0) {
      queueService.play(p.tracks[0], p.tracks);
      setCurrentTrack(p.tracks[0]);
      setDuration(p.tracks[0].duration);
      audioService.playTrack(p.tracks[0]);
    }
    addToast(`${t('play')}: ${p.title}`, 'info');
  };

  const handleLikeToggle = (id: number) => {
    const isNowLiked = soundcloudApi.toggleLocalLike(id);
    const track = soundcloudApi.getTrack(id);
    const title = track ? track.title : 'Track';
    addToast(isNowLiked ? `${t('trackLiked')}: ${title}` : `${t('trackUnliked')}: ${title}`, 'success');
  };

  const handleDownload = (id: number) => {
    const track = soundcloudApi.getTrack(id) || tracks.find((tr) => tr.id === id);
    if (track) {
      downloaderService.downloadTrack(track);
      addToast(`${t('downloading')}: ${track.title}`, 'info');
    }
  };

  const handlePlayAll = () => {
    if (!authService.isAuthenticated()) {
      setIsLoginModalOpen(true);
      addToast(t('authRequired'), 'error');
      return;
    }
    if (tracks.length === 0) return;
    queueService.play(tracks[0], tracks);
    setCurrentTrack(tracks[0]);
    setDuration(tracks[0].duration);
    audioService.playTrack(tracks[0]);
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

  const handleCycleRepeat = () => {
    const next = queueService.cycleRepeat();
    setRepeatMode(next);
  };

  const handleToggleShuffle = () => {
    const next = !shuffle;
    setShuffle(next);
    queueService.setShuffle(next);
  };

  const isPlayerDownloading = currentTrack
    ? downloadingIds.has(currentTrack.id)
    : false;

  const resolvedBgSrc = useMemo(() => {
    if (!customBg.url) return '';
    const raw = customBg.url.trim();
    if (/^[a-zA-Z]:[\\/]/.test(raw)) {
      return `local-media://asset/${raw.replace(/\\/g, '/')}`;
    }
    if (raw.startsWith('file:///')) {
      const pathPart = raw.replace(/^file:\/\/\//, '');
      return `local-media://asset/${pathPart}`;
    }
    if (raw.startsWith('local-media://') && !raw.startsWith('local-media://asset/')) {
      const pathPart = raw.replace(/^local-media:\/*/, '');
      return `local-media://asset/${pathPart}`;
    }
    return raw;
  }, [customBg.url]);

  return (
    <div
      className={`min-h-screen ${
        customBg.type !== 'none' && resolvedBgSrc ? 'bg-transparent' : 'bg-[#121212]'
      } text-white flex flex-col relative pb-20`}
    >
      {customBg.type !== 'none' && resolvedBgSrc && (
        <div className="sc-bg-layer">
          {customBg.type === 'video' ? (
            <video
              key={resolvedBgSrc}
              src={resolvedBgSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
              style={{ filter: `blur(${customBg.blur}px)` }}
              onError={(e) => {
                console.warn('Video background failed to load:', e);
              }}
            />
          ) : (
            <img
              key={resolvedBgSrc}
              src={resolvedBgSrc}
              alt="Custom background"
              className="w-full h-full object-cover"
              style={{ filter: `blur(${customBg.blur}px)` }}
              onError={(e) => {
                console.warn('Image background failed to load:', e);
              }}
            />
          )}
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: customBg.opacity / 100 }}
          />
        </div>
      )}

      <Header
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenThemeSettings={() => setIsThemeModalOpen(true)}
      />

      <main className="mx-auto max-w-[1400px] w-full flex-1 relative z-10 flex flex-col">
        <Routes>
          <Route
            path="/"
            element={
              <HomeView
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                downloadingIds={downloadingIds}
                onTrackPlay={(t, l) => handleTrackPlay(t, l)}
                onLikeToggle={handleLikeToggle}
                onDownload={handleDownload}
                onSelectPlaylist={handleSelectPlaylist}
                onOpenComments={handleOpenCommentsModal}
                onNavigateTab={(tab) => {
                  if (tab === 'Playlists') navigate('/playlists');
                  else if (tab === 'Library') navigate('/library');
                  else if (tab === 'Stream') navigate('/feed');
                }}
              />
            }
          />
          <Route
            path="/feed"
            element={
              <FeedView
                onPlayTrack={(t, l) => handleTrackPlay(t, l)}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onLikeTrack={(t) => handleLikeToggle(t.id)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            }
          />
          <Route
            path="/library"
            element={
              <LibraryView
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                downloadingIds={downloadingIds}
                onTrackPlay={(t, l) => handleTrackPlay(t, l)}
                onLikeToggle={handleLikeToggle}
                onDownload={handleDownload}
                onSelectPlaylist={handleSelectPlaylist}
                onOpenComments={handleOpenCommentsModal}
              />
            }
          />
          <Route
            path="/playlists"
            element={
              <PlaylistsView
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                downloadingIds={downloadingIds}
                onTrackPlay={(t, l) => handleTrackPlay(t, l)}
                onLikeToggle={handleLikeToggle}
                onDownload={handleDownload}
                onSelectPlaylist={handleSelectPlaylist}
                onOpenComments={handleOpenCommentsModal}
              />
            }
          />
          <Route
            path="/search"
            element={
              <SearchResultsView
                onPlayTrack={(t, l) => handleTrackPlay(t, l)}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onLikeTrack={(t) => handleLikeToggle(t.id)}
              />
            }
          />
          <Route
            path="/tracks/:id"
            element={
              <TrackPageView
                onPlayTrack={(t, l) => handleTrackPlay(t, l)}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onLikeTrack={(t) => handleLikeToggle(t.id)}
                onDownloadTrack={(t) => handleDownload(t.id)}
              />
            }
          />
          <Route
            path="/artist/:query"
            element={
              <ArtistView
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                downloadingIds={downloadingIds}
                onTrackPlay={(t, l) => handleTrackPlay(t, l)}
                onLikeToggle={handleLikeToggle}
                onDownload={handleDownload}
                onSelectPlaylist={handleSelectPlaylist}
                onOpenComments={handleOpenCommentsModal}
              />
            }
          />
          <Route
            path="/settings"
            element={<SettingsView onOpenLogin={() => setIsLoginModalOpen(true)} />}
          />
          <Route
            path="/profile"
            element={
              <ProfileView
                user={currentUser}
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                downloadingIds={downloadingIds}
                onTrackPlay={(t, l) => handleTrackPlay(t, l)}
                onLikeToggle={handleLikeToggle}
                onDownload={handleDownload}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            }
          />
          <Route
            path="/downloads"
            element={<DownloadsView downloads={downloads} />}
          />
          <Route
            path="/stream"
            element={
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
                  <div className="text-center py-20 text-[#888888]">
                    {t('loadingChart')}
                  </div>
                ) : (
                  <TrackList
                    tracks={tracks}
                    currentTrackId={currentTrack?.id ?? null}
                    isPlaying={isPlaying}
                    onTrackPlay={(t, l) => handleTrackPlay(t, l || tracks)}
                    onLikeToggle={handleLikeToggle}
                    downloadingIds={downloadingIds}
                    onDownload={handleDownload}
                    onOpenComments={handleOpenCommentsModal}
                  />
                )}
              </>
            }
          />
        </Routes>
      </main>

      {currentTrack && (
        <MiniPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          shuffle={shuffle}
          repeatMode={repeatMode}
          liked={currentTrack?.liked ?? false}
          downloading={isPlayerDownloading}
          queueCount={queueService.getState().items.length}
          isQueueOpen={isQueueOpen}
          comments={currentTrackComments}
          speed={speed}
          sleepTimerSeconds={sleepTimerSeconds}
          onPlayPause={() => audioService.togglePlay()}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onVolume={handleVolumeChange}
          onShuffle={handleToggleShuffle}
          onRepeat={handleCycleRepeat}
          onLike={() => currentTrack && handleLikeToggle(currentTrack.id)}
          onDownload={() => currentTrack && handleDownload(currentTrack.id)}
          onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
          onOpenComments={() => handleOpenCommentsModal()}
          onOpenLyrics={() => setIsLyricsOpen(true)}
          onTrackTitleClick={() => navigate(`/tracks/${currentTrack.id}`)}
          onArtistClick={(artist) => navigate(`/artist/${encodeURIComponent(artist)}`)}
        />
      )}

      <QueuePanel
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        onPlayTrack={(t) => handleTrackPlay(t)}
        isPlaying={isPlaying}
        onPlayPause={() => audioService.togglePlay()}
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
            className="flex items-center gap-2.5 rounded bg-[#1e1e1e]/95 border border-[#333333] px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-semibold text-white pointer-events-auto animate-in slide-in-from-right-4 duration-200"
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            ) : t.type === 'warning' ? (
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
            ) : (
              <Info size={16} className="text-[#ff5500] shrink-0" />
            )}
            <span className="truncate max-w-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/overlay" element={<DesktopOverlay />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
