import { useState, useEffect, useRef } from 'react';
import { Track, LyricsData } from '@/types';
import { lyricsService } from '@/services/lyrics';
import { X, Mic2, Loader2, Music2 } from 'lucide-react';

interface LyricsModalProps {
  track: Track | null;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSeek: (timeSeconds: number) => void;
}

export default function LyricsModal({
  track,
  currentTime,
  isOpen,
  onClose,
  onSeek,
}: LyricsModalProps) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && track) {
      setLoading(true);
      lyricsService.fetchLyrics(track.title, track.artist).then((data) => {
        if (isMounted) {
          setLyrics(data);
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, track]);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  if (!isOpen || !track) return null;

  let activeIndex = -1;
  if (lyrics && lyrics.synced) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (currentTime >= lyrics.lines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl h-[700px] flex flex-col rounded-sc border border-sc-border bg-[#141414]/95 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-sc-border px-6 py-4 bg-[#181818]/90">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={track.artwork}
              alt={track.title}
              className="h-11 w-11 rounded-sc object-cover border border-sc-border shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate flex items-center gap-2">
                {track.title}
                {lyrics?.synced && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sc-accent text-white font-extrabold uppercase tracking-wider">
                    Synced
                  </span>
                )}
              </h3>
              <p className="text-xs text-sc-text-secondary truncate">{track.artist}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-sc-text-secondary hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-8 py-12 space-y-6 scroll-smooth text-center"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-sc-text-secondary py-20">
              <Loader2 size={32} className="animate-spin-slow text-sc-accent mb-3" />
              <p className="text-sm">Searching LRCLIB synchronized lyrics...</p>
            </div>
          ) : !lyrics || lyrics.lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-sc-text-secondary py-24">
              <Mic2 size={44} className="text-sc-border mb-3" />
              <p className="text-base font-bold text-white">No lyrics available</p>
              <p className="text-xs text-sc-text-secondary max-w-xs mt-1">
                Lyrics for this track could not be found in the open lyrics database.
              </p>
            </div>
          ) : (
            lyrics.lines.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 py-1.5 px-4 rounded-sc select-none ${
                    isActive
                      ? 'text-white text-2xl font-black scale-105 drop-shadow-[0_0_12px_var(--sc-accent)]'
                      : isPast
                      ? 'text-sc-text-secondary/70 text-lg hover:text-white hover:scale-102'
                      : 'text-sc-text-secondary/40 text-lg hover:text-white hover:scale-102'
                  }`}
                >
                  <p className="leading-relaxed">{line.text}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-sc-border px-6 py-3 bg-[#111] flex items-center justify-between text-[11px] text-sc-text-secondary">
          <span className="flex items-center gap-1.5">
            <Music2 size={13} className="text-sc-accent" />
            Click any line to jump to that moment
          </span>
          <span>Powered by LRCLIB Open Lyrics</span>
        </div>
      </div>
    </div>
  );
}
