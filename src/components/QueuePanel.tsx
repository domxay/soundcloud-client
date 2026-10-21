import React, { useEffect, useState } from 'react';
import { X, Trash2, Music, Play, Pause } from 'lucide-react';
import { queueService, QueueState } from '@/services/queue';
import { Track } from '@/types';
import { TrackRow } from '@/components/ui/TrackRow';
import { Button } from '@/components/ui/Button';

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
          <h2 className="font-bold text-white text-base">Next up</h2>
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
              title="Clear upcoming queue"
            >
              Clear
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
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5500] ${isPlaying ? 'opacity-75' : 'opacity-0'}`} />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff5500]" />
                </span>
                Now Playing
              </span>
              {onPlayPause && (
                <button
                  onClick={onPlayPause}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ff5500] text-white hover:bg-[#ff6600] transition-colors flex items-center gap-1 shadow-sm"
                  title={isPlaying ? 'Pause playback' : 'Resume playback'}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={12} className="fill-white" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} className="fill-white ml-0.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <TrackRow
              track={currentTrack}
              isActive={true}
              isPlaying={isPlaying}
              onPlay={() => {
                if (onPlayPause) {
                  onPlayPause();
                } else {
                  onPlayTrack(currentTrack);
                }
              }}
            />
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider px-2 mb-2 block">
            Next in Queue ({upcomingTracks.length})
          </span>
          {upcomingTracks.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#777777]">
              No upcoming tracks in queue. Play a track or add to queue.
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingTracks.map((track, i) => {
                const actualIndex = state.currentIndex + 1 + i;
                return (
                  <div key={`${track.id}-${actualIndex}`} className="relative group">
                    <TrackRow
                      track={track}
                      onPlay={() => onPlayTrack(track)}
                      onMore={() => queueService.remove(actualIndex)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
