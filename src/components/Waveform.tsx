import { useEffect, useState, useRef } from 'react';
import { soundcloudApi } from '@/services/api';
import { genWaveform, formatTime } from '@/services/utils';
import { Comment } from '@/types';

interface WaveformProps {
  bars?: number[];
  waveformUrl?: string;
  progress?: number;
  height?: number;
  className?: string;
  onSeek?: (progress: number) => void;
  interactive?: boolean;
  isPlaying?: boolean;
  trackId?: number;
  duration?: number;
  comments?: Comment[];
}

export default function Waveform({
  bars: initialBars,
  waveformUrl,
  progress = 0,
  height = 36,
  className = '',
  onSeek,
  interactive = false,
  isPlaying = false,
  trackId = 0,
  duration = 0,
  comments = [],
}: WaveformProps) {
  const [bars, setBars] = useState<number[]>(initialBars || genWaveform(trackId || 42));
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [hoverComment, setHoverComment] = useState<Comment | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (waveformUrl) {
      soundcloudApi.fetchWaveformData(waveformUrl).then((loadedBars) => {
        if (isMounted && loadedBars.length > 0) {
          setBars(loadedBars);
        }
      });
    } else if (initialBars && initialBars.length > 0) {
      setBars(initialBars);
    } else {
      setBars(genWaveform(trackId || 42));
    }
    return () => {
      isMounted = false;
    };
  }, [waveformUrl, initialBars, trackId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const p = Math.max(0, Math.min(1, x / rect.width));
    setHoverProgress(p);
    setHoverX(x);
  };

  const handleMouseLeave = () => {
    setHoverProgress(null);
    setHoverComment(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(p);
  };

  const topHeight = Math.round(height * 0.72);
  const bottomHeight = Math.round(height * 0.28);
  const hoverSeconds = hoverProgress !== null && duration > 0 ? hoverProgress * duration : 0;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center select-none ${interactive ? 'cursor-pointer py-1' : ''} ${className}`}
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {interactive && hoverProgress !== null && duration > 0 && (
        <div
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-[#1e1e1e] px-1.5 py-0.5 text-[10px] font-semibold text-white border border-sc-border shadow-md z-30 whitespace-nowrap"
          style={{ left: hoverX }}
        >
          {formatTime(hoverSeconds)}
        </div>
      )}

      {hoverComment && (
        <div
          className="pointer-events-none absolute -top-14 -translate-x-1/2 rounded-sc bg-[#161616] border border-sc-border px-2.5 py-1 text-xs text-white shadow-xl z-40 max-w-[200px]"
          style={{ left: Math.min(Math.max(50, hoverX), (containerRef.current?.clientWidth || 300) - 50) }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <img src={hoverComment.user.avatar_url} alt="" className="w-3.5 h-3.5 rounded-full" />
            <span className="text-[10px] font-bold text-sc-accent truncate">{hoverComment.user.username}</span>
            <span className="text-[9px] text-sc-text-secondary">at {formatTime(hoverComment.timestamp / 1000)}</span>
          </div>
          <p className="text-[11px] text-sc-text-primary truncate">{hoverComment.body}</p>
        </div>
      )}

      {interactive && hoverProgress !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-[1px] bg-white/70 z-20"
          style={{ left: hoverX }}
        />
      )}

      <div className="flex-1 flex items-center gap-[1.5px] h-full relative">
        {bars.map((sample, i) => {
          const barPos = i / bars.length;
          const isPlayed = barPos <= progress;
          const isHovered = hoverProgress !== null && barPos <= hoverProgress && !isPlayed;

          let topColor = 'var(--sc-wave-inactive, #444444)';
          let bottomColor = '#242424';

          if (isPlayed) {
            topColor = 'var(--sc-wave-active, #ff5500)';
            bottomColor = 'var(--sc-wave-active, #b83e00)';
          } else if (isHovered) {
            topColor = '#777777';
            bottomColor = '#444444';
          }

          const topBarH = Math.max(3, Math.round(sample * topHeight));
          const botBarH = Math.max(2, Math.round(sample * bottomHeight * 0.7));

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-center h-full">
              <div
                className="w-full rounded-t-[1px] transition-colors duration-100"
                style={{
                  height: topBarH,
                  backgroundColor: topColor,
                  boxShadow: isPlayed && isPlaying ? '0 0 4px var(--sc-accent)' : 'none',
                }}
              />
              <div className="w-full h-[1px]" />
              <div
                className="w-full rounded-b-[1px] transition-colors duration-100"
                style={{
                  height: botBarH,
                  backgroundColor: bottomColor,
                  opacity: 0.7,
                }}
              />
            </div>
          );
        })}

        {interactive && duration > 0 && comments.slice(0, 15).map((c) => {
          const pos = (c.timestamp / 1000) / duration;
          if (pos < 0 || pos > 1) return null;
          return (
            <div
              key={c.id}
              className="absolute bottom-0 -translate-x-1/2 z-20 cursor-pointer transition-transform hover:scale-150"
              style={{ left: `${pos * 100}%` }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setHoverComment(c);
              }}
              onMouseLeave={() => setHoverComment(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (onSeek) onSeek(pos);
              }}
            >
              <img
                src={c.user.avatar_url}
                alt=""
                className="w-3.5 h-3.5 rounded-full border border-sc-border shadow-sm object-cover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
