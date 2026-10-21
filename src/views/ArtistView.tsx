import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  UserCheck,
  UserPlus,
  ExternalLink,
  MapPin,
  Users,
  Music,
  ListMusic,
  Loader2,
  ArrowLeft,
  BadgeCheck,
  Disc3,
  Share2,
} from 'lucide-react';
import { Track, Playlist, UserProfile } from '@/types';
import { soundcloudApi } from '@/services/api';
import TrackList from '@/components/TrackList';

interface ArtistViewProps {
  currentTrackId: number | null;
  isPlaying: boolean;
  downloadingIds: Set<number>;
  onTrackPlay: (track: Track, list?: Track[]) => void;
  onLikeToggle: (id: number) => void;
  onDownload: (id: number) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onOpenComments?: (track: Track) => void;
}

export const ArtistView: React.FC<ArtistViewProps> = ({
  currentTrackId,
  isPlaying,
  downloadingIds,
  onTrackPlay,
  onLikeToggle,
  onDownload,
  onSelectPlaylist,
  onOpenComments,
}) => {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();

  const [artist, setArtist] = useState<UserProfile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'about'>('tracks');
  const [isFollowing, setIsFollowing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!query) return;

    setLoading(true);
    setArtist(null);
    setTracks([]);
    setPlaylists([]);

    const loadArtistData = async () => {
      try {
        const decoded = decodeURIComponent(query);
        let profile: UserProfile | null = null;

        // If numeric ID was passed in query
        if (/^\d+$/.test(decoded)) {
          profile = await soundcloudApi.getArtistById(decoded);
        } else {
          profile = await soundcloudApi.getArtistByName(decoded);
        }

        if (!isMounted) return;

        if (profile) {
          setArtist(profile);

          // Check following state in localStorage
          try {
            const followed = localStorage.getItem(`sc_followed_${profile.id}`);
            setIsFollowing(Boolean(followed));
          } catch {}

          const [artistTracks, artistPlaylists] = await Promise.all([
            soundcloudApi.getArtistTracks(profile.id),
            soundcloudApi.getArtistPlaylists(profile.id),
          ]);

          if (isMounted) {
            setTracks(artistTracks);
            setPlaylists(artistPlaylists);
          }
        } else {
          // If profile could not be resolved directly, search tracks by this artist as fallback
          const searched = await soundcloudApi.searchTracks(decoded, 40);
          if (isMounted) {
            setTracks(searched);
            setArtist({
              id: Date.now(),
              username: decoded,
              avatar_url: searched[0]?.artwork || '',
              track_count: searched.length,
            });
          }
        }
      } catch {
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadArtistData();

    return () => {
      isMounted = false;
    };
  }, [query]);

  const handleToggleFollow = () => {
    if (!artist) return;
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) {
        localStorage.setItem(`sc_followed_${artist.id}`, 'true');
      } else {
        localStorage.removeItem(`sc_followed_${artist.id}`);
      }
    } catch {}
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      onTrackPlay(tracks[0], tracks);
    }
  };

  const handleShare = () => {
    if (artist?.permalink_url) {
      navigator.clipboard?.writeText(artist.permalink_url);
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-sc-text-secondary">
        <Loader2 size={36} className="animate-spin text-sc-accent mb-3" />
        <p className="text-sm font-semibold text-white">Loading Artist Profile...</p>
        <p className="text-xs text-sc-text-secondary mt-1">Fetching discography and official feeds</p>
      </div>
    );
  }

  if (!artist && !loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-24">
        <h2 className="text-xl font-bold text-white mb-2">Artist Not Found</h2>
        <p className="text-xs text-sc-text-secondary mb-6">
          Could not find an artist profile matching "{query}".
        </p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-sc bg-sc-accent px-5 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          Go Back
        </button>
      </div>
    );
  }

  const location = artist?.city ? `${artist.city}${artist.country_code ? `, ${artist.country_code}` : ''}` : null;
  const followersFormatted = artist?.followers_count
    ? artist.followers_count >= 1000000
      ? `${(artist.followers_count / 1000000).toFixed(1)}M`
      : artist.followers_count >= 1000
      ? `${Math.round(artist.followers_count / 1000)}K`
      : String(artist.followers_count)
    : null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-36 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-semibold text-sc-text-secondary hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Hero Header */}
      <div className="relative rounded-sc border border-sc-border overflow-hidden bg-[#181818] shadow-2xl">
        {/* Background Visual Banner */}
        <div className="absolute inset-0 h-48 md:h-56 bg-gradient-to-r from-sc-surface to-[#222222] overflow-hidden">
          {artist?.header_image_url ? (
            <img
              src={artist.header_image_url}
              alt={artist.username}
              className="w-full h-full object-cover opacity-60"
            />
          ) : artist?.avatar_url ? (
            <img
              src={artist.avatar_url}
              alt={artist.username}
              className="w-full h-full object-cover opacity-20 blur-2xl scale-125"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent" />
        </div>

        {/* Profile Content */}
        <div className="relative pt-24 md:pt-28 px-6 md:px-8 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-full overflow-hidden border-4 border-[#181818] bg-[#222222] shadow-2xl shrink-0 ring-1 ring-sc-border">
              {artist?.avatar_url ? (
                <img
                  src={artist.avatar_url}
                  alt={artist.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black">
                  {artist?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sc-accent">
                  Artist &bull; SoundCloud
                </span>
                {artist?.verified && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                    <BadgeCheck size={12} />
                    Verified
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                {artist?.username}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-sc-text-secondary pt-1">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-sc-accent" />
                    {location}
                  </span>
                )}
                {followersFormatted && (
                  <span className="flex items-center gap-1">
                    <Users size={13} />
                    <strong className="text-white">{followersFormatted}</strong> followers
                  </span>
                )}
                <span>
                  <strong className="text-white">{tracks.length}</strong> tracks
                </span>
                {playlists.length > 0 && (
                  <span>
                    &bull; <strong className="text-white">{playlists.length}</strong> albums
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 shrink-0 pt-2 md:pt-0">
            {tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="rounded-sc bg-sc-accent px-5 py-2.5 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors flex items-center gap-2 shadow-lg shadow-sc-accent/25"
              >
                <Play size={15} fill="white" />
                Play All Tracks
              </button>
            )}

            <button
              onClick={handleToggleFollow}
              className={`rounded-sc border px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isFollowing
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-900/40'
                  : 'bg-sc-surface border-sc-border text-white hover:border-sc-accent'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={14} />
                  Following
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Follow
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="rounded-sc border border-sc-border bg-sc-surface p-2.5 text-xs font-semibold text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors"
              title="Share Artist"
            >
              <Share2 size={15} />
            </button>

            {artist?.permalink_url && (
              <button
                onClick={() => window.open(artist.permalink_url, '_blank')}
                className="rounded-sc border border-sc-border bg-sc-surface p-2.5 text-xs font-semibold text-sc-text-secondary hover:text-white hover:border-sc-accent transition-colors"
                title="Open on official SoundCloud"
              >
                <ExternalLink size={15} />
              </button>
            )}
          </div>
        </div>

        {copiedLink && (
          <div className="px-6 py-1.5 bg-emerald-950/80 border-t border-emerald-800 text-[11px] font-semibold text-emerald-400 text-center">
            Artist link copied to clipboard!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-sc-border pb-1">
        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-4 py-2 text-xs font-bold rounded-sc transition-colors flex items-center gap-1.5 ${
            activeTab === 'tracks'
              ? 'bg-sc-accent text-white shadow-md'
              : 'text-sc-text-secondary hover:text-white hover:bg-sc-surface'
          }`}
        >
          <Music size={14} />
          Tracks ({tracks.length})
        </button>

        {playlists.length > 0 && (
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 text-xs font-bold rounded-sc transition-colors flex items-center gap-1.5 ${
              activeTab === 'playlists'
                ? 'bg-sc-accent text-white shadow-md'
                : 'text-sc-text-secondary hover:text-white hover:bg-sc-surface'
            }`}
          >
            <ListMusic size={14} />
            Albums & Playlists ({playlists.length})
          </button>
        )}

        {artist?.description && (
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 text-xs font-bold rounded-sc transition-colors flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'bg-sc-accent text-white shadow-md'
                : 'text-sc-text-secondary hover:text-white hover:bg-sc-surface'
            }`}
          >
            <Disc3 size={14} />
            About
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'tracks' ? (
        tracks.length === 0 ? (
          <div className="text-center py-20 text-xs text-sc-text-secondary border border-dashed border-sc-border rounded-sc">
            No public tracks found for this artist.
          </div>
        ) : (
          <TrackList
            tracks={tracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            downloadingIds={downloadingIds}
            onTrackPlay={(t) => onTrackPlay(t, tracks)}
            onLikeToggle={onLikeToggle}
            onDownload={onDownload}
            onOpenComments={onOpenComments}
          />
        )
      ) : activeTab === 'playlists' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPlaylist?.(p)}
              className="group cursor-pointer rounded-sc border border-sc-border bg-sc-surface p-3 transition-all hover:border-sc-accent hover:bg-sc-hover"
            >
              <div className="relative aspect-square rounded-sc overflow-hidden mb-2.5 bg-sc-bg border border-sc-border">
                {p.artwork ? (
                  <img
                    src={p.artwork}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
              <h4 className="text-xs font-bold text-white truncate" title={p.title}>
                {p.title}
              </h4>
              <p className="text-[11px] text-sc-text-secondary truncate mt-0.5">{p.artist}</p>
              <span className="text-[10px] text-sc-accent font-medium mt-1 inline-block">
                {p.tracks.length > 0 ? `${p.tracks.length} tracks` : 'Album'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl rounded-sc border border-sc-border bg-sc-surface p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Biography & Links</h3>
          <p className="text-xs text-[#cccccc] leading-relaxed whitespace-pre-wrap font-sans">
            {artist?.description}
          </p>
          {artist?.permalink_url && (
            <div className="pt-2">
              <a
                href={artist.permalink_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sc-accent hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Open full SoundCloud profile
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
