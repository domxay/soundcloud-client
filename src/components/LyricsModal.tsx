import { useState, useEffect, useRef } from 'react';
import { Track, LyricsData } from '@/types';
import { lyricsService } from '@/services/lyrics';
import { X, Mic2, Loader2, Music2, ExternalLink, Edit3, Check, FileText } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'lyrics' | 'description' | 'editor'>('lyrics');
  const [customText, setCustomText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
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
      setCustomText(lyricsService.getUserLyrics(track.id)?.plainText || '');
      lyricsService
        .fetchLyrics(track.title, track.artist, track.id, track.description, track.duration)
        .then((data) => {
          if (isMounted) {
            setLyrics(data);
            setLoading(false);
            if (!data && track.description && track.description.trim().length > 10) {
              setActiveTab('description');
            } else {
              setActiveTab('lyrics');
            }
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, track]);

  useEffect(() => {
    if (activeLineRef.current && containerRef.current && activeTab === 'lyrics') {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, activeTab]);

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

  const handleSaveCustomLyrics = () => {
    lyricsService.saveUserLyrics(track.id, customText);
    const updated = lyricsService.getUserLyrics(track.id);
    setLyrics(updated);
    setSavedSuccess(true);
    setActiveTab('lyrics');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleOpenGenius = () => {
    const q = `${lyricsService.cleanArtist(track.artist)} ${lyricsService.cleanTitle(track.title)}`;
    window.open(`https://genius.com/search?q=${encodeURIComponent(q)}`, '_blank');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl h-[700px] flex flex-col rounded-sc border border-sc-border bg-[#141414]/95 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sc-border px-6 py-4 bg-[#181818]/90">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={track.artwork || '/favicon.png'}
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

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sc-text-secondary hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-sc-border bg-[#111111] px-6 gap-2">
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'lyrics'
                ? 'border-sc-accent text-sc-accent'
                : 'border-transparent text-sc-text-secondary hover:text-white'
            }`}
          >
            <Mic2 size={13} />
            Lyrics {lyrics ? `(${lyrics.lines.length} lines)` : ''}
          </button>

          {track.description && (
            <button
              onClick={() => setActiveTab('description')}
              className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'description'
                  ? 'border-sc-accent text-sc-accent'
                  : 'border-transparent text-sc-text-secondary hover:text-white'
              }`}
            >
              <FileText size={13} />
              SoundCloud Description
            </button>
          )}

          <button
            onClick={() => setActiveTab('editor')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'editor'
                ? 'border-sc-accent text-sc-accent'
                : 'border-transparent text-sc-text-secondary hover:text-white'
            }`}
          >
            <Edit3 size={13} />
            Custom Lyrics
          </button>
        </div>

        {/* Content Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-8 py-8 space-y-5 scroll-smooth"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-sc-text-secondary py-20">
              <Loader2 size={32} className="animate-spin text-sc-accent mb-3" />
              <p className="text-sm font-medium">Resolving lyrics & author notes...</p>
            </div>
          ) : activeTab === 'editor' ? (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Add or Edit Lyrics for this Track</h4>
                <p className="text-xs text-sc-text-secondary">
                  Paste the lyrics or stanzas below. They will be stored in your local library and synchronized with playback.
                </p>
              </div>

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="[Verse 1]&#10;Paste lyrics line by line..."
                rows={12}
                className="w-full rounded-sc border border-sc-border bg-[#181818] p-3 text-xs text-white placeholder:text-sc-text-secondary/50 focus:border-sc-accent focus:outline-none font-sans leading-relaxed"
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSaveCustomLyrics}
                  className="rounded-sc bg-sc-accent px-5 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors flex items-center gap-2 shadow-lg shadow-sc-accent/20"
                >
                  <Check size={14} />
                  Save Lyrics
                </button>
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 font-semibold">Saved successfully!</span>
                )}
              </div>
            </div>
          ) : activeTab === 'description' && track.description ? (
            <div className="max-w-xl mx-auto py-4 text-left space-y-4">
              <div className="p-4 rounded-sc border border-sc-border bg-[#181818]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sc-accent mb-2">
                  Official Track Description from {track.artist}
                </h4>
                <p className="text-xs text-[#dddddd] whitespace-pre-wrap leading-relaxed font-sans">
                  {track.description}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-sc-text-secondary">
                {track.genre && <span>Genre: <strong className="text-white">{track.genre}</strong></span>}
                {track.plays && <span>&bull; Plays: <strong className="text-white">{track.plays}</strong></span>}
              </div>
            </div>
          ) : !lyrics || lyrics.lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-sc-text-secondary py-16 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-[#1e1e1e] border border-sc-border flex items-center justify-center text-sc-accent mb-4">
                <Mic2 size={24} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Lyrics Not Found Online</h3>
              <p className="text-xs text-sc-text-secondary mb-6 leading-relaxed">
                Independent and underground SoundCloud tracks may not be listed on international lyric servers.
                You can search on Genius or paste your own lyrics.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleOpenGenius}
                  className="rounded-sc border border-sc-border bg-sc-surface px-4 py-2 text-xs font-semibold text-white hover:border-sc-accent hover:text-sc-accent transition-colors flex items-center gap-2"
                >
                  <ExternalLink size={13} />
                  Search on Genius
                </button>

                <button
                  onClick={() => setActiveTab('editor')}
                  className="rounded-sc bg-sc-accent px-4 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors flex items-center gap-2 shadow-md shadow-sc-accent/20"
                >
                  <Edit3 size={13} />
                  Add Custom Lyrics
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 py-4">
              {lyrics.lines.map((line, idx) => {
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
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-sc-border px-6 py-3 bg-[#111111] flex items-center justify-between text-[11px] text-sc-text-secondary">
          <span className="flex items-center gap-1.5">
            <Music2 size={13} className="text-sc-accent" />
            {lyrics?.synced ? 'Click any line to jump to that moment' : 'SoundCloud Music Companion'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenGenius}
              className="hover:text-sc-accent transition-colors flex items-center gap-1 text-[11px]"
            >
              Genius Lyrics
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
