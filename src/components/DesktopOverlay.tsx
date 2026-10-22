import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  X,
  Mic2,
  Music2,
  Sliders,
  GripVertical,
} from 'lucide-react';
import { OverlayState } from '@/types';

// Visual breathing padding to prevent Windows DWM box shadow clipping
const PADDING_X = 24;
const PADDING_Y = 24;

export default function DesktopOverlay() {
  const [state, setState] = useState<OverlayState>({
    track: null,
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    activeLyric: '',
    nextLyric: '',
    themeAccent: '#ff5500',
  });

  const [mode, setMode] = useState<'compact' | 'expanded'>(() => {
    return (localStorage.getItem('sc_overlay_mode') as 'compact' | 'expanded') || 'compact';
  });

  const [shapeStyle, setShapeStyle] = useState<'pill' | 'squircle'>(() => {
    return (localStorage.getItem('sc_overlay_shape') as 'pill' | 'squircle') || 'pill';
  });

  const [cardWidth, setCardWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sc_overlay_width');
    return saved ? parseInt(saved, 10) : 560;
  });

  // Track scrubber state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Native smooth dragging via Electron IPC across the main surface
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isResizingRef.current || isScrubbing) return;
    const target = e.target as HTMLElement;
    // Never drag if user clicks a button, input, scrubber, or edge resize handle
    if (target.closest('button, input, select, textarea, a, [data-interactive="true"], [data-resize-handle="true"]')) {
      return;
    }

    isDraggingRef.current = true;
    startPosRef.current = { x: e.screenX, y: e.screenY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.screenX - startPosRef.current.x;
      const deltaY = moveEvent.screenY - startPosRef.current.y;
      startPosRef.current = { x: moveEvent.screenX, y: moveEvent.screenY };

      if (deltaX !== 0 || deltaY !== 0) {
        if (window.electronAPI?.moveOverlay) {
          window.electronAPI.moveOverlay(deltaX, deltaY);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Interactive Track Seek Scrubber
  const handleSeekMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0 || !progressBarRef.current) return;

    const trackDuration = state.duration || 0;
    const rect = progressBarRef.current.getBoundingClientRect();

    const calculateRatio = (clientX: number) => {
      const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      return rect.width > 0 ? offsetX / rect.width : 0;
    };

    setIsScrubbing(true);
    const initialRatio = calculateRatio(e.clientX);
    setScrubRatio(initialRatio);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const ratio = calculateRatio(moveEvent.clientX);
      setScrubRatio(ratio);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const finalRatio = Math.max(0, Math.min(0.999, calculateRatio(upEvent.clientX)));
      setIsScrubbing(false);
      setScrubRatio(null);
      setState((prev) => ({ ...prev, progress: finalRatio }));
      handleAction('seek', finalRatio);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Edge interactive resize handlers (Left & Right ends)
  const handleEdgeResizeStart = async (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;

    isResizingRef.current = true;
    const startX = e.screenX;
    const startCardW = cardWidth;
    const cardH = mode === 'compact' ? 52 : 106;
    const targetWindowH = cardH + PADDING_Y;

    // Get current window bounds from Electron
    let startBounds = { x: 0, y: 14, width: startCardW + PADDING_X, height: targetWindowH };
    if (window.electronAPI?.getOverlayBounds) {
      try {
        startBounds = await window.electronAPI.getOverlayBounds();
      } catch {}
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.screenX - startX;

      if (direction === 'right') {
        // Right edge drag: left side stays pinned at startBounds.x, right expands/contracts
        const nextCardW = Math.max(380, Math.min(960, Math.round(startCardW + delta)));
        setCardWidth(nextCardW);
        localStorage.setItem('sc_overlay_width', nextCardW.toString());

        if (window.electronAPI?.resizeOverlay) {
          window.electronAPI.resizeOverlay({
            width: nextCardW + PADDING_X,
            height: targetWindowH,
            x: startBounds.x,
          });
        }
      } else {
        // Left edge drag: right side stays pinned, left expands/contracts
        const nextCardW = Math.max(380, Math.min(960, Math.round(startCardW - delta)));
        const growth = nextCardW - startCardW;
        setCardWidth(nextCardW);
        localStorage.setItem('sc_overlay_width', nextCardW.toString());

        if (window.electronAPI?.resizeOverlay) {
          window.electronAPI.resizeOverlay({
            width: nextCardW + PADDING_X,
            height: targetWindowH,
            x: startBounds.x - growth,
          });
        }
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Ensure background transparency for desktop floating overlay
  useEffect(() => {
    document.body.classList.add('overlay-mode');
    document.documentElement.classList.add('overlay-mode');
    return () => {
      document.body.classList.remove('overlay-mode');
      document.documentElement.classList.remove('overlay-mode');
    };
  }, []);

  // Listen to Electron IPC state updates
  useEffect(() => {
    if (window.electronAPI?.onOverlayState) {
      const unsub = window.electronAPI.onOverlayState((newState: OverlayState) => {
        if (newState) setState(newState);
      });
      return unsub;
    }
  }, []);

  // BroadcastChannel fallback for dev / dual web contexts
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('sc_overlay_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'state') {
          setState(event.data.payload);
        }
      };
      return () => bc.close();
    } catch {}
  }, []);

  // Handle window resizing when mode changes
  useEffect(() => {
    localStorage.setItem('sc_overlay_mode', mode);
    localStorage.setItem('sc_overlay_width', cardWidth.toString());
    const cardH = mode === 'compact' ? 52 : 106;
    const targetW = cardWidth + PADDING_X;
    const targetH = cardH + PADDING_Y;
    if (window.electronAPI?.resizeOverlay) {
      window.electronAPI.resizeOverlay({ width: targetW, height: targetH });
    }
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('sc_overlay_shape', shapeStyle);
  }, [shapeStyle]);

  const handleAction = (action: string, payload?: any) => {
    if (window.electronAPI?.sendOverlayAction) {
      window.electronAPI.sendOverlayAction(action, payload);
    }
    try {
      const bc = new BroadcastChannel('sc_overlay_channel');
      bc.postMessage({ type: 'action', action, payload });
      bc.close();
    } catch {}
  };

  const handleRestoreApp = () => {
    if (window.electronAPI?.restoreMainWindow) {
      window.electronAPI.restoreMainWindow();
    } else {
      handleAction('restore');
    }
  };

  const handleClose = () => {
    handleAction('close');
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'));
  };

  const toggleShape = () => {
    setShapeStyle((prev) => (prev === 'pill' ? 'squircle' : 'pill'));
  };

  const accent = state.themeAccent || '#ff5500';
  const track = state.track;

  const currentRatio = scrubRatio !== null ? scrubRatio : state.progress || 0;
  const currentSeconds = Math.round(currentRatio * (state.duration || 0));

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-screen h-screen flex items-center justify-center p-3 m-0 select-none bg-transparent overflow-hidden font-sans cursor-grab active:cursor-grabbing"
    >
      {/* Pristine OLED Floating Card Container (Seamless, No White Border) */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-full max-w-full transition-[height] duration-200 flex flex-col justify-between overflow-hidden relative border-0 bg-[#0c0c0e] cursor-grab active:cursor-grabbing shadow-[0_12px_36px_rgba(0,0,0,0.95),0_2px_8px_rgba(0,0,0,0.8)] ${
          shapeStyle === 'pill' ? 'rounded-full' : 'rounded-2xl'
        }`}
        style={{
          boxShadow: `0 12px 36px rgba(0, 0, 0, 0.95), 0 2px 8px rgba(0, 0, 0, 0.8)`,
        }}
      >
        {/* Left Edge Resize Handle (↔ Hover to resize) */}
        <div
          data-resize-handle="true"
          onMouseDown={(e) => handleEdgeResizeStart(e, 'left')}
          className="absolute left-0 top-0 bottom-0 w-3.5 z-50 cursor-ew-resize flex items-center justify-center group"
          title="Потяните край для изменения ширины"
        >
          <div className="w-0.5 h-4 rounded-full bg-zinc-700/60 group-hover:bg-zinc-400 transition-colors" />
        </div>

        {/* Right Edge Resize Handle (↔ Hover to resize) */}
        <div
          data-resize-handle="true"
          onMouseDown={(e) => handleEdgeResizeStart(e, 'right')}
          className="absolute right-0 top-0 bottom-0 w-3.5 z-50 cursor-ew-resize flex items-center justify-center group"
          title="Потяните край для изменения ширины"
        >
          <div className="w-0.5 h-4 rounded-full bg-zinc-700/60 group-hover:bg-zinc-400 transition-colors" />
        </div>

        {/* Interactive Progress Track Bar & Scrubber Slider */}
        <div
          ref={progressBarRef}
          data-interactive="true"
          onMouseDown={handleSeekMouseDown}
          className="absolute top-0 left-0 right-0 h-3 -mt-0.5 pt-0.5 cursor-pointer group/seek z-40 select-none"
          title={`Перемотка: ${formatTime(currentSeconds)} / ${formatTime(state.duration || 0)}`}
        >
          {/* Track Line Background */}
          <div className="w-full h-[3px] group-hover/seek:h-[4.5px] bg-zinc-800 group-hover/seek:bg-zinc-700 transition-all relative overflow-visible">
            {/* Filled Accent Progress Bar */}
            <div
              className="h-full relative pointer-events-none"
              style={{
                width: `${Math.min(100, Math.max(0, currentRatio * 100))}%`,
                backgroundColor: accent,
              }}
            >
              {/* Scrubbing Thumb Knob */}
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border border-black/40 shadow-sm transition-transform pointer-events-none ${
                  isScrubbing ? 'scale-125 opacity-100' : 'opacity-0 group-hover/seek:opacity-100 scale-100'
                }`}
                style={{
                  boxShadow: `0 0 6px ${accent}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Controls Row */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center px-3.5 py-1.5 gap-2.5 h-[50px] cursor-grab active:cursor-grabbing ${
            shapeStyle === 'pill' ? 'px-4' : 'px-3.5'
          }`}
        >
          {/* Tactical Grip Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-white px-0.5 py-1.5 flex items-center justify-center transition-colors shrink-0 select-none"
            title="Зажмите для перемещения"
          >
            <GripVertical size={14} />
          </div>

          {/* Track Cover Artwork */}
          <div
            data-interactive="true"
            className="relative shrink-0 cursor-pointer group"
            onClick={handleRestoreApp}
            title="Развернуть SoundCloud Desktop"
          >
            {track?.artwork ? (
              <img
                src={track.artwork}
                alt={track.title}
                className={`h-8 w-8 object-cover border-0 shadow-md transition-transform group-hover:scale-105 pointer-events-none ${
                  shapeStyle === 'pill' ? 'rounded-full' : 'rounded-lg'
                }`}
              />
            ) : (
              <div
                className={`h-8 w-8 bg-zinc-900 border-0 flex items-center justify-center text-zinc-400 ${
                  shapeStyle === 'pill' ? 'rounded-full' : 'rounded-lg'
                }`}
              >
                <Music2 size={15} />
              </div>
            )}
            {state.isPlaying && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black animate-pulse shadow-sm"
                style={{ backgroundColor: accent }}
              />
            )}
          </div>

          {/* Track Information (Draggable, Double-Click Restores) */}
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={handleRestoreApp}
            className="flex-1 min-w-0 pr-1 cursor-grab active:cursor-grabbing"
            title="Зажмите для перемещения • Двойной клик: развернуть"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate leading-snug">
                {track?.title || 'Воспроизведение остановлено'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate leading-tight">
              <span className="truncate">{track?.artist || 'SoundCloud Desktop'}</span>
              {mode === 'compact' && state.activeLyric && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300 italic truncate font-medium" style={{ color: `${accent}ee` }}>
                    {state.activeLyric}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Media Playback Controls */}
          <div
            data-interactive="true"
            className="flex items-center gap-1.5 shrink-0"
          >
            <button
              onClick={() => handleAction('prev')}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Предыдущий трек"
            >
              <SkipBack size={14} fill="currentColor" />
            </button>

            <button
              onClick={() => handleAction('play-pause')}
              className="w-8 h-8 flex items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95 hover:brightness-110"
              style={{ backgroundColor: accent }}
              title={state.isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {state.isPlaying ? (
                <Pause size={15} fill="white" />
              ) : (
                <Play size={15} fill="white" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={() => handleAction('next')}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Следующий трек"
            >
              <SkipForward size={14} fill="currentColor" />
            </button>
          </div>

          {/* Right Utility Buttons: Lyrics Toggle, Shape Switcher, Restore, Close */}
          <div
            data-interactive="true"
            className="flex items-center gap-1 shrink-0 pl-1 border-l border-zinc-800/80"
          >
            <button
              onClick={toggleMode}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                mode === 'expanded'
                  ? 'bg-white/20 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={mode === 'expanded' ? 'Компактный режим' : 'Показать текст песни'}
            >
              <Mic2 size={13} style={mode === 'expanded' ? { color: accent } : undefined} />
            </button>

            <button
              onClick={toggleShape}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title={`Форма: ${shapeStyle === 'pill' ? 'Овал' : 'Квадрат со скруглением'}`}
            >
              <Sliders size={12} />
            </button>

            <button
              onClick={handleRestoreApp}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Развернуть окно приложения"
            >
              <Maximize2 size={12} />
            </button>

            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Скрыть оверлей"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Lower Expanded Row: Real-time Synchronized Lyrics */}
        {mode === 'expanded' && (
          <div
            onMouseDown={handleMouseDown}
            className="px-5 py-2.5 bg-black/40 border-t border-zinc-800/60 flex flex-col justify-center min-h-[50px] cursor-grab active:cursor-grabbing"
            title="Зажмите для перемещения"
          >
            {state.activeLyric ? (
              <div
                className="flex flex-col gap-0.5"
                onDoubleClick={handleRestoreApp}
              >
                <div
                  className="text-xs font-semibold tracking-wide drop-shadow truncate animate-fade-in"
                  style={{ color: accent }}
                >
                  ♪ {state.activeLyric}
                </div>
                {state.nextLyric && (
                  <div className="text-[11px] text-zinc-400 truncate opacity-70">
                    {state.nextLyric}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-500 italic">
                <Music2 size={13} className="shrink-0 text-zinc-600" />
                <span>
                  {state.track ? 'Текст песни загружается...' : 'Включите трек для показа текста'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
