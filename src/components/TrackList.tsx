import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, Download, MoreHorizontal, Loader2, MessageSquare } from 'lucide-react';
import { Track } from '@/types';
import { formatTime, formatRelativeTime } from '@/services/utils';
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
  return (
    <div className="px-8 pb-32">
      <div className="grid grid-cols-[28px_1fr_160px_70px_100px_130px_30px] items-center gap-4 border-b border-sc-border pb-2 text-xs font-semibold uppercase tracking-wider text-sc-text-secondary select-none">
        <span className="text-center">#</span>
        <span className="min-w-0 truncate">Название</span>
        <span className="min-w-0 truncate">Исполнитель</span>
        <span className="text-right">Время</span>
        <span className="text-right truncate">Прослушивания</span>
        <span className="text-center">Действия</span>
        <span></span>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-20 text-sc-text-secondary">
          Треки не найдены. Попробуйте обновить стрим или проверить статус VPN в настройках.
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackPlay(track);
                  }}
                  className="hidden group-hover:block transition-transform active:scale-95"
                >
                  <Play size={14} fill="white" className="text-white" />
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative shrink-0">
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="h-10 w-10 rounded-sc object-cover border border-sc-border"
                    loading="lazy"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackPlay(track);
                    }}
                    className="absolute inset-0 hidden items-center justify-center rounded-sc bg-black/60 group-hover:flex"
                  >
                    {showPlay ? (
                      <Pause size={16} fill="white" className="text-white" />
                    ) : (
                      <Play size={16} fill="white" className="text-white ml-0.5" />
                    )}
                  </button>
                </div>
                <div className="overflow-hidden flex-1">
                  <p
                    onClick={() => onTrackPlay(track)}
                    className={`truncate text-sm font-medium cursor-pointer hover:underline ${
                      isCurrent ? 'text-sc-accent font-semibold' : 'text-white'
                    }`}
                  >
                    {track.title}
                  </p>
                  {(track.created_at || track.display_date) && (
                    <p className="text-[10px] text-sc-text-secondary/70 truncate mt-0.5">
                      Загружен {formatRelativeTime(track.created_at || track.display_date)}
                    </p>
                  )}
                  <div className="mt-1">
                    <Waveform
                      waveformUrl={track.waveform_url}
                      progress={isCurrent ? 0.35 : 0}
                      height={18}
                      isPlaying={showPlay}
                      trackId={track.id}
                    />
                  </div>
                </div>
              </div>

              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/artist/${encodeURIComponent(track.artist)}`);
                }}
                className="truncate text-sm text-sc-text-secondary hover:text-white hover:underline cursor-pointer"
                title={`View ${track.artist}'s profile & discography`}
              >
                {track.artist}
              </span>

              <span className="text-right text-sm text-sc-text-secondary tabular-nums">
                {formatTime(track.duration)}
              </span>

              <span className="text-right text-sm text-sc-text-secondary">
                {track.plays}
              </span>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLikeToggle(track.id);
                  }}
                  className={`transition-colors hover:text-sc-accent p-1 ${
                    track.liked ? 'text-sc-accent' : 'text-sc-text-secondary'
                  }`}
                  title={track.liked ? 'Удалить из лайков' : 'Поставить лайк'}
                >
                  <Heart size={15} fill={track.liked ? 'var(--sc-accent)' : 'none'} />
                </button>
                {onOpenComments && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenComments(track);
                    }}
                    className="text-sc-text-secondary hover:text-white transition-colors p-1"
                    title="Комментарии к треку"
                  >
                    <MessageSquare size={15} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(track.id);
                  }}
                  disabled={isDownloading}
                  className="text-sc-text-secondary hover:text-white transition-colors p-1 disabled:opacity-50"
                  title="Скачать аудиофайл"
                >
                  {isDownloading ? (
                    <Loader2 size={15} className="animate-spin text-sc-accent" />
                  ) : (
                    <Download size={15} />
                  )}
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (track.permalink_url) {
                    navigator.clipboard?.writeText(track.permalink_url);
                  } else {
                    navigator.clipboard?.writeText(`${track.artist} - ${track.title}`);
                  }
                }}
                className="text-sc-text-secondary opacity-0 transition-opacity hover:text-white group-hover:opacity-100 p-1"
                title="Копировать ссылку на трек"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
