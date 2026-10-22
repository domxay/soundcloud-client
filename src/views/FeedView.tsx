import React, { useEffect, useState } from 'react';
import { Radio, RefreshCw, Flame } from 'lucide-react';
import { Track } from '@/types';
import { soundcloudApi } from '@/services/api';
import { authService } from '@/services/auth';
import { TrackRow } from '@/components/ui/TrackRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/services/i18n';

interface FeedViewProps {
  onPlayTrack: (track: Track, list?: Track[]) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onLikeTrack: (track: Track) => void;
  onOpenLogin: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  onPlayTrack,
  currentTrack,
  isPlaying,
  onLikeTrack,
  onOpenLogin,
}) => {
  const { t } = useI18n();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuth = authService.isAuthenticated();

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAuth) {
        const stream = await soundcloudApi.getStream(40);
        if (stream && stream.length > 0) {
          setTracks(stream);
          return;
        }
      }
      const trending = await soundcloudApi.getTrending(40);
      setTracks(trending);
    } catch (err: any) {
      setError(err?.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [isAuth]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={22} className="text-[#ff5500]" />
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('feedTitle')}</h1>
          </div>
          <p className="text-xs text-[#999999] mt-1">
            {isAuth ? t('feedAuthSubtitle') : t('feedGuestSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isAuth && (
            <Button size="sm" variant="secondary" onClick={onOpenLogin}>
              {t('signInForFeed')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={loadFeed}
          >
            {t('refreshFeed')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-[#181818]">
              <Skeleton className="w-10 h-10 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="w-12 h-3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadFeed} />
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={<Flame size={28} />}
          title={t('feedEmptyTitle')}
          description={t('feedEmptyDesc')}
          actionLabel={t('refreshFeed')}
          onAction={loadFeed}
        />
      ) : (
        <div className="space-y-1 bg-[#141414] rounded-lg border border-[#222222] p-2">
          {tracks.map((track, index) => (
            <TrackRow
              key={`${track.id}-${index}`}
              track={track}
              index={index}
              showIndex={true}
              isActive={currentTrack?.id === track.id}
              isPlaying={isPlaying && currentTrack?.id === track.id}
              onPlay={() => onPlayTrack(track, tracks)}
              onLike={() => onLikeTrack(track)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
