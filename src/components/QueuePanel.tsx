import React, { useEffect, useState } from 'react';
import { X, Trash2, Music, Play, Pause } from 'lucide-react';
import { queueService, QueueState } from '@/services/queue';
import { Track } from '@/types';
import { TrackRow } from '@/components/ui/TrackRow';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/services/i18n';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  isOpen,
  onClose,
  onPlayTrack,
  isPlaying = false,
  onPlayPause,
}) => {
  const { t } = useI18n();
  const [state, setState] = useState<QueueState>(queueService.getState());

  useEffect(() => {
    return queueService.subscribe((updated) => setState(updated));
  }, []);

  if (!isOpen) return null;

  const currentTrack = queueService.getCurrentTrack();
  const upcomingTracks = state.items.slice(state.currentIndex + 1);

  return (
    <div className="fixed top-0 bottom-[74px] right-0 w-96 max-w-full bg-[#181818] border-l border-[#282828] z-40 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#282828]">
        <div className="flex items-center gap-2">
          <Music size={18} className="text-[#ff5500]" />
          <h2 className="font-bold text-white text-base">{t('queue')}</h2>
          <span className="text-xs text-[#888888] font-mono">
            ({state.items.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state.items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => queueService.clear()}
              title={t('clearQueue')}
            >
              {t('clearQueue')}
            </Button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#999999] hover:text-white hover:bg-[#282828] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {currentTrack && (
          <div className="bg-[#1e1e1e] rounded-lg p-3 border border-[#2e2e2e]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#ff5500] uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5500] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff5500]"></span>
                </span>
                {t('nowPlaying')}
              </span>
            </div>
            <TrackRow
              track={currentTrack}
              index={state.currentIndex + 1}
              isActive={true}
              isPlaying={isPlaying}
              onPlay={() => onPlayTrack(currentTrack)}
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider">
              {t('upNext')}
            </span>
            <span className="text-xs text-[#666666]">
              {upcomingTracks.length}
            </span>
          </div>

          {upcomingTracks.length === 0 ? (
            <div className="py-12 text-center text-[#666666] text-xs">
              {t('emptyQueue')}
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingTracks.map((track, i) => (
                <div key={`${track.id}-${i}`} className="group relative">
                  <TrackRow
                    track={track}
                    index={state.currentIndex + 2 + i}
                    onPlay={() => onPlayTrack(track)}
                  />
                  <button
                    onClick={() => queueService.remove(state.currentIndex + 1 + i)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-[#666666] hover:text-[#ff5500] hover:bg-[#282828] opacity-0 group-hover:opacity-100 transition-all"
                    title={t('clearQueue')}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
