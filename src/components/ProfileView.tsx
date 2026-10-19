import { useState, useEffect } from 'react';
import { UserProfile, Track, Playlist } from '@/types';
import { soundcloudApi } from '@/services/api';
import { ExternalLink, Music, Heart, ListMusic, MapPin, Users, Disc3 } from 'lucide-react';
import TrackList from './TrackList';

interface ProfileViewProps {
  user: UserProfile | null;
  currentTrackId: number | null;
  isPlaying: boolean;
  downloadingIds: Set<number>;
  onTrackPlay: (track: Track) => void;
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
          if (found && !prev.some((t) => t.id === trackId)) {
            return [{ ...found, liked: true }, ...prev];
          }
          return prev.map((t) => (t.id === trackId ? { ...t, liked: true } : t));
        } else {
          return prev.filter((t) => t.id !== trackId);
        }
      });
      setHistoryTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, liked: isLiked } : t))
      );
    });

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, 120000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMounted = false;
      unsub();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleOpenWebProfile = () => {
    if (user?.permalink_url) {
      window.open(user.permalink_url, '_blank');
    }
  };

  const username = user?.username || 'SoundCloud User';
  const avatar = user?.avatar_url;
  const location = user?.city ? `${user.city}${user.country_code ? `, ${user.country_code}` : ''}` : null;

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
            <span className="text-[11px] font-bold uppercase tracking-widest text-sc-accent">SOUNDCLOUD PROFILE</span>
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
                <span>{user?.followers_count ?? 0} Followers</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{user?.followings_count ?? 0} Following</span>
              </div>
              <div className="flex items-center gap-1">
                <Disc3 size={13} />
                <span>{historyTracks.length} Stream Tracks</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart size={13} />
                <span>{likedTracks.length} Likes</span>
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
                Open on SoundCloud
              </button>
            )}
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 rounded-sc bg-sc-accent px-4 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors shadow-lg shadow-sc-accent/25"
            >
              Switch Account
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
          Recently Played ({historyTracks.length})
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
          Liked Tracks ({likedTracks.length})
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
          Playlists ({userPlaylists.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sc-text-secondary">Loading profile tracks...</div>
      ) : profileTab === 'playlists' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {userPlaylists.map((p) => (
            <div
              key={p.id}
              className="group rounded-sc border border-sc-border bg-sc-surface p-4 transition-all hover:border-sc-accent hover:bg-sc-hover"
            >
              <img
                src={p.artwork}
                alt={p.title}
                className="w-full aspect-square rounded-sc object-cover shadow-lg border border-sc-border mb-3"
              />
              <h4 className="text-sm font-bold text-white truncate">{p.title}</h4>
              <p className="text-xs text-sc-text-secondary truncate mt-0.5">{p.artist}</p>
              <span className="text-[11px] text-sc-accent mt-2 inline-block font-medium">
                {p.tracks.length} tracks
              </span>
            </div>
          ))}
        </div>
      ) : (
        <TrackList
          tracks={profileTab === 'stream' ? historyTracks : likedTracks}
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
  );
}
