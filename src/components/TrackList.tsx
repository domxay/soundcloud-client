import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, Download, MoreHorizontal, Loader2, MessageSquare } from 'lucide-react';
import { Track } from '@/types';
import { formatTime, formatRelativeTime } from '@/services/utils';
import { useI18n } from '@/services/i18n';
import Waveform from './Waveform';

interface TrackListProps {
  tracks: Track[];
  currentTrackId: number | null;
  isPlaying: boolean;
  onTrackPlay: (track: Track) => void;
  onLikeToggle: (id: number) => void;
  downloadingIds: Set<number>;
  onDownload: (id: number) => void;
  onOpenComments?: (track: Track) => void;
}

export default function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  onTrackPlay,
  onLikeToggle,
  downloadingIds,
  onDownload,
  onOpenComments,
}: TrackListProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="px-8 pb-32">
      <div className="grid grid-cols-[28px_1fr_160px_70px_100px_130px_30px] items-center gap-4 border-b border-sc-border pb-2 text-xs font-semibold uppercase tracking-wider text-sc-text-secondary select-none">
        <span className="text-center">#</span>
        <span className="min-w-0 truncate">{t('colTitle')}</span>
        <span className="min-w-0 truncate">{t('colArtist')}</span>
        <span className="text-right">{t('colDuration')}</span>
        <span className="text-right truncate">{t('colPlays')}</span>
        <span className="text-center">{t('colActions')}</span>
        <span></span>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-20 text-sc-text-secondary">
          {t('noTracksFound')}
        </div>
      ) : (
        tracks.map((track, index) => {
          const isCurrent = currentTrackId === track.id;
          const isDownloading = downloadingIds.has(track.id);
          const showPlay = isCurrent && isPlaying;

          return (
            <div
              key={track.id}
              className={`group grid grid-cols-[28px_1fr_160px_70px_100px_130px_30px] items-center gap-4 rounded-sc py-2.5 transition-colors hover:bg-[#1f1f1f] select-none ${
                isCurrent ? 'bg-[#1a1a1a]' : ''
              }`}
            >
              <div className="flex items-center justify-center">
                <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-sc-accent font-bold' : 'text-sc-text-secondary'}`}>
                  {showPlay ? <Pause size={14} fill="var(--sc-accent)" /> : index + 1}
                </span>
                <button
                  onClick={() => onTrackPlay(track)}
                  className="hidden group-hover:flex items-center justify-center text-white"
                >
                  {showPlay ? (
                    <Pause size={14} fill="white" />
                  ) : (
                    <Play size={14} fill="white" className="ml-0.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={track.artwork}
                  alt={track.title}
                  className="h-10 w-10 rounded-sc object-cover border border-sc-border shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-semibold truncate ${isCurrent ? 'text-sc-accent font-bold' : 'text-white'}`}>
                    {track.title}
                  </h4>
                  {(track.created_at || track.display_date) && (
                    <p className="text-[11px] text-sc-text-secondary truncate">
                      {formatRelativeTime(track.created_at || track.display_date)}
                    </p>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <span
                  onClick={() => navigate(`/artist/${encodeURIComponent(track.artist)}`)}
                  className="text-xs text-sc-text-secondary hover:text-white hover:underline cursor-pointer truncate block"
                >
                  {track.artist}
                </span>
              </div>

              <div className="text-right text-xs text-sc-text-secondary font-mono">
                {formatTime(track.duration)}
              </div>

              <div className="text-right text-xs text-sc-accent font-semibold font-mono">
                {track.plays || '-'}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onLikeToggle(track.id)}
                  className={`p-1.5 transition-colors hover:text-sc-accent ${track.liked ? 'text-sc-accent' : 'text-sc-text-secondary'}`}
                  title={track.liked ? t('trackLiked') : t('like')}
                >
                  <Heart size={16} fill={track.liked ? 'var(--sc-accent)' : 'none'} />
                </button>

                {onOpenComments && (
                  <button
                    onClick={() => onOpenComments(track)}
                    className="p-1.5 text-sc-text-secondary hover:text-sc-accent transition-colors"
                    title={t('comments')}
                  >
                    <MessageSquare size={16} />
                  </button>
                )}

                <button
                  onClick={() => onDownload(track.id)}
                  disabled={isDownloading}
                  className="p-1.5 text-sc-text-secondary hover:text-sc-accent transition-colors disabled:opacity-50"
                  title={t('download')}
                >
                  {isDownloading ? (
                    <Loader2 size={16} className="animate-spin-slow text-sc-accent" />
                  ) : (
                    <Download size={16} />
                  )}
                </button>
              </div>

              <div></div>
            </div>
          );
        })
      )}
    </div>
  );
}
