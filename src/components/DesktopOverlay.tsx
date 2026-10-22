import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  X,
  Mic2,
  Music2,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { OverlayState } from '@/types';

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
      const unsub = window.electronAPI.onOverlayState((newState) => {
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
    const targetWidth = mode === 'compact' ? 540 : 580;
    const targetHeight = mode === 'compact' ? 54 : 110;
    if (window.electronAPI?.resizeOverlay) {
      window.electronAPI.resizeOverlay(targetWidth, targetHeight);
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

  return (
    <div className="w-screen h-screen flex items-start justify-center p-0 m-0 select-none bg-transparent overflow-hidden font-sans">
      <div
        className={`w-full max-w-full transition-all duration-300 flex flex-col justify-between overflow-hidden relative shadow-[0_12px_40px_rgba(0,0,0,0.85)] border border-white/15 backdrop-blur-2xl bg-black/85 ${
          shapeStyle === 'pill' ? 'rounded-full' : 'rounded-2xl'
        }`}
        style={{
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.75), 0 0 16px ${accent}25`,
        }}
      >
        {/* Upper Progress Track Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${Math.min(100, Math.max(0, state.progress * 100))}%`,
              backgroundColor: accent,
            }}
          />
        </div>

        {/* Main Controls Row */}
        <div
          className={`flex items-center px-3.5 py-1.5 gap-3 h-[52px] ${
            shapeStyle === 'pill' ? 'px-4' : 'px-3.5'
          }`}
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          {/* Track Cover Artwork */}
          <div
            className="relative shrink-0 cursor-pointer group"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onClick={handleRestoreApp}
            title="Развернуть SoundCloud Desktop"
          >
            {track?.artwork ? (
              <img
                src={track.artwork}
                alt={track.title}
                className={`h-9 w-9 object-cover border border-white/20 shadow-md transition-transform group-hover:scale-105 ${
                  shapeStyle === 'pill' ? 'rounded-full' : 'rounded-lg'
                }`}
              />
            ) : (
              <div
                className={`h-9 w-9 bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 ${
                  shapeStyle === 'pill' ? 'rounded-full' : 'rounded-lg'
                }`}
              >
                <Music2 size={16} />
              </div>
            )}
            {state.isPlaying && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-black animate-pulse shadow-sm"
                style={{ backgroundColor: accent }}
              />
            )}
          </div>

          {/* Track Information */}
          <div
            className="flex-1 min-w-0 cursor-pointer pr-1"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onClick={handleRestoreApp}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate max-w-[210px] leading-snug">
                {track?.title || 'Воспроизведение остановлено'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate leading-tight">
              <span className="truncate max-w-[150px]">{track?.artist || 'SoundCloud Desktop'}</span>
              {mode === 'compact' && state.activeLyric && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300 italic truncate max-w-[140px] font-medium" style={{ color: `${accent}dd` }}>
                    {state.activeLyric}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Media Playback Controls */}
          <div
            className="flex items-center gap-1.5 shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as any}
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
            className="flex items-center gap-1 shrink-0 pl-1 border-l border-white/10"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <button
              onClick={toggleMode}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                mode === 'expanded'
                  ? 'bg-white/20 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={mode === 'expanded' ? 'Компактный режим' : 'Показать текст песни (Lyrics)'}
            >
              <Mic2 size={13} style={mode === 'expanded' ? { color: accent } : undefined} />
            </button>

            <button
              onClick={toggleShape}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title={`Форма: ${shapeStyle === 'pill' ? 'Овал (Pill)' : 'Квадрат со скруглением'}`}
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
            className="px-5 py-2.5 bg-black/60 border-t border-white/10 flex flex-col justify-center min-h-[52px]"
            style={{ WebkitAppRegion: 'drag' } as any}
          >
            {state.activeLyric ? (
              <div
                className="flex flex-col gap-0.5 cursor-pointer"
                style={{ WebkitAppRegion: 'no-drag' } as any}
                onClick={handleRestoreApp}
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
              <div
                className="flex items-center gap-2 text-xs text-zinc-500 italic"
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                <Music2 size={13} className="shrink-0 text-zinc-600" />
                <span>
                  {state.track ? 'Текст песни загружается или недоступен...' : 'Включите трек для показа текста'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
