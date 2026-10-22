import { useState, useEffect } from 'react';
import { UserProfile, Track, Playlist } from '@/types';
import { soundcloudApi } from '@/services/api';
import { useI18n } from '@/services/i18n';
import { ExternalLink, Music, Heart, ListMusic, MapPin, Users, Disc3 } from 'lucide-react';
import TrackList from './TrackList';

interface ProfileViewProps {
  user: UserProfile | null;
  currentTrackId: number | null;
  isPlaying: boolean;
  downloadingIds: Set<number>;
  onTrackPlay: (track: Track, list?: Track[]) => void;
  onLikeToggle: (id: number) => void;
  onDownload: (id: number) => void;
  onOpenLogin: () => void;
  onOpenComments?: (track: Track) => void;
}

export default function ProfileView({
  user,
  currentTrackId,
  isPlaying,
  downloadingIds,
  onTrackPlay,
  onLikeToggle,
  onDownload,
  onOpenLogin,
  onOpenComments,
}: ProfileViewProps) {
  const { t } = useI18n();
  const [profileTab, setProfileTab] = useState<'stream' | 'likes' | 'playlists'>('stream');
  const [historyTracks, setHistoryTracks] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = (silent = false) => {
      if (!silent) setLoading(true);
      Promise.all([
        soundcloudApi.getUserPlayHistory(),
        soundcloudApi.getUserLikes(),
        soundcloudApi.getUserPlaylists(),
      ]).then(([history, likes, playlists]) => {
        if (isMounted) {
          setHistoryTracks(history);
          setLikedTracks(likes);
          setUserPlaylists(playlists);
          if (!silent) setLoading(false);
        }
      }).catch(() => {
        if (isMounted && !silent) setLoading(false);
      });
    };
    load();

    const unsub = soundcloudApi.subscribeLikes((trackId, isLiked) => {
      setLikedTracks((prev) => {
        if (isLiked) {
          const found = soundcloudApi.getTrack(trackId);
          if (found && !prev.some((tr) => tr.id === trackId)) {
            return [{ ...found, liked: true }, ...prev];
          }
          return prev.map((tr) => (tr.id === trackId ? { ...tr, liked: true } : tr));
        } else {
          return prev.filter((tr) => tr.id !== trackId);
        }
      });
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const username = user?.username || 'SoundCloud Member';
  const avatar = user?.avatar_url;
  const location = [user?.city, user?.country_code].filter(Boolean).join(', ');

  const handleOpenWebProfile = () => {
    if (user?.permalink_url && (window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(user.permalink_url);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-32">
      <div className="relative rounded-sc overflow-hidden border border-sc-border bg-gradient-to-r from-[#2c1a0e] via-[#1f1a18] to-[#141414] p-8 shadow-2xl mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          {avatar ? (
            <img
              src={avatar}
              alt={username}
              className="h-32 w-32 rounded-full object-cover border-4 border-sc-surface shadow-2xl shrink-0"
            />
          ) : (
            <div className="h-32 w-32 rounded-full bg-sc-surface border-4 border-sc-surface shadow-2xl shrink-0 flex items-center justify-center text-3xl font-black text-white">
              {username.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 text-center md:text-left">
            <span className="text-[11px] font-bold uppercase tracking-widest text-sc-accent">{t('profileTitle')}</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-1">{username}</h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-sc-text-secondary mt-2">
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin size={13} className="text-sc-accent" />
                  <span>{location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users size={13} />
                <span>{user?.followers_count ?? 0} {t('followersCount')}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{user?.followings_count ?? 0} {t('followingCount')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Disc3 size={13} />
                <span>{historyTracks.length} {t('streamTracksCount')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart size={13} />
                <span>{likedTracks.length} {t('likesCount')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user?.permalink_url && (
              <button
                onClick={handleOpenWebProfile}
                className="flex items-center gap-1.5 rounded-sc border border-sc-border bg-sc-surface px-3.5 py-2 text-xs font-semibold text-white hover:bg-sc-hover transition-colors"
              >
                <ExternalLink size={14} />
                {t('openOnWeb')}
              </button>
            )}
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 rounded-sc bg-sc-accent px-4 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-lg shadow-sc-accent/25"
            >
              {t('switchAccount')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-sc-border pb-3 mb-6">
        <button
          onClick={() => setProfileTab('stream')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sc text-sm font-semibold transition-colors ${
            profileTab === 'stream'
              ? 'bg-sc-accent text-white'
              : 'text-sc-text-secondary hover:text-white hover:bg-sc-surface'
          }`}
        >
          <Music size={15} />
          {t('recentlyPlayed')} ({historyTracks.length})
        </button>
        <button
          onClick={() => setProfileTab('likes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sc text-sm font-semibold transition-colors ${
            profileTab === 'likes'
              ? 'bg-sc-accent text-white'
              : 'text-sc-text-secondary hover:text-white hover:bg-sc-surface'
          }`}
        >
          <Heart size={15} />
          {t('likedTracks')} ({likedTracks.length})
        </button>
        <button
          onClick={() => setProfileTab('playlists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-sc text-sm font-semibold transition-colors ${
            profileTab === 'playlists'
              ? 'bg-sc-accent text-white'
              : 'text-sc-text-secondary hover:text-white hover:bg-sc-surface'
          }`}
        >
          <ListMusic size={15} />
          {t('playlists')} ({userPlaylists.length})
        </button>
      </div>

      <div>
        {profileTab === 'stream' && (
          <TrackList
            tracks={historyTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onTrackPlay={onTrackPlay}
            onLikeToggle={onLikeToggle}
            downloadingIds={downloadingIds}
            onDownload={onDownload}
            onOpenComments={onOpenComments}
          />
        )}

        {profileTab === 'likes' && (
          <TrackList
            tracks={likedTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onTrackPlay={onTrackPlay}
            onLikeToggle={onLikeToggle}
            downloadingIds={downloadingIds}
            onDownload={onDownload}
            onOpenComments={onOpenComments}
          />
        )}

        {profileTab === 'playlists' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {userPlaylists.map((p) => (
              <div
                key={p.id}
                className="group cursor-pointer rounded-sc border border-sc-border bg-sc-surface p-3 hover:border-sc-accent transition-all"
              >
                <img
                  src={p.artwork}
                  alt={p.title}
                  className="aspect-square w-full rounded-sc object-cover mb-2 border border-sc-border"
                />
                <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                <p className="text-[11px] text-sc-text-secondary truncate mt-0.5">{p.tracks.length} {t('tracksCount')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
