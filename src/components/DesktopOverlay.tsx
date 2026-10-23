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
  Clock,
  Gauge,
  RotateCcw,
} from 'lucide-react';
import { OverlayState } from '@/types';
import { useI18n } from '@/services/i18n';

// Zero padding ensures no rectangular window clipping or box artifacts on Windows DWM
const PADDING_X = 0;
const PADDING_Y = 0;

export default function DesktopOverlay() {
  const { t } = useI18n();

  const [state, setState] = useState<OverlayState>({
    track: null,
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    activeLyric: '',
    nextLyric: '',
    themeAccent: '#ff5500',
    speed: 1.0,
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

  // Shape and Playback Speed Drawer State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(1.0);

  // PC System Time (Local Clock)
  const [systemTime, setSystemTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync incoming speed from App state
  useEffect(() => {
    if (typeof state.speed === 'number' && state.speed > 0) {
      setCurrentSpeed(state.speed);
    }
  }, [state.speed]);

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

  const getTargetHeight = (curMode: 'compact' | 'expanded', openSettings: boolean) => {
    const baseH = curMode === 'compact' ? 50 : 104;
    return openSettings ? baseH + 52 : baseH;
  };

  // Edge interactive resize handlers (Left & Right ends)
  const handleEdgeResizeStart = async (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;

    isResizingRef.current = true;
    const startX = e.screenX;
    const startCardW = cardWidth;
    const targetH = getTargetHeight(mode, isSettingsOpen);

    // Get current window bounds from Electron
    let startBounds = { x: 0, y: 14, width: startCardW, height: targetH };
    if (window.electronAPI?.getOverlayBounds) {
      try {
        startBounds = await window.electronAPI.getOverlayBounds();
      } catch {}
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.screenX - startX;

      if (direction === 'right') {
        const nextCardW = Math.max(380, Math.min(960, Math.round(startCardW + delta)));
        setCardWidth(nextCardW);
        localStorage.setItem('sc_overlay_width', nextCardW.toString());

        if (window.electronAPI?.resizeOverlay) {
          window.electronAPI.resizeOverlay({
            width: nextCardW,
            height: targetH,
            x: startBounds.x,
          });
        }
      } else {
        const nextCardW = Math.max(380, Math.min(960, Math.round(startCardW - delta)));
        const growth = nextCardW - startCardW;
        setCardWidth(nextCardW);
        localStorage.setItem('sc_overlay_width', nextCardW.toString());

        if (window.electronAPI?.resizeOverlay) {
          window.electronAPI.resizeOverlay({
            width: nextCardW,
            height: targetH,
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

  // Handle window resizing when mode or settings drawer state changes
  useEffect(() => {
    localStorage.setItem('sc_overlay_mode', mode);
    localStorage.setItem('sc_overlay_width', cardWidth.toString());
    const targetH = getTargetHeight(mode, isSettingsOpen);
    if (window.electronAPI?.resizeOverlay) {
      window.electronAPI.resizeOverlay({ width: cardWidth, height: targetH });
    }
  }, [mode, isSettingsOpen, cardWidth]);

  useEffect(() => {
    localStorage.setItem('sc_overlay_shape', shapeStyle);
  }, [shapeStyle]);

  const handleAction = (action: string, payload?: any) => {
    if (window.electronAPI?.sendOverlayAction) {
      window.electronAPI.sendOverlayAction(action, payload);
      return;
    }
    try {
      const bc = new BroadcastChannel('sc_overlay_channel');
      bc.postMessage({ type: 'action', action, payload });
      bc.close();
    } catch {}
  };

  const handleSpeedChange = (val: number) => {
    const rounded = Math.round(val * 100) / 100;
    const clamped = Math.max(0.5, Math.min(2.0, rounded));
    setCurrentSpeed(clamped);
    handleAction('set-speed', clamped);
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

  const pcTimeFormatted = systemTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const pcTimeTooltip = `${systemTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })} • ${systemTime.toLocaleDateString()}`;

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-screen h-screen flex items-center justify-center p-0 m-0 select-none bg-transparent overflow-hidden font-sans cursor-grab active:cursor-grabbing"
    >
      {/* Pristine OLED Floating Card Container */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-full h-full flex flex-col justify-between overflow-hidden relative border border-zinc-800/80 bg-[#0c0c0e] cursor-grab active:cursor-grabbing shadow-none transition-[border-radius] duration-200 ${
          shapeStyle === 'pill'
            ? mode === 'compact' && !isSettingsOpen
              ? 'rounded-full'
              : 'rounded-3xl'
            : 'rounded-2xl'
        }`}
      >
        {/* Left Edge Resize Handle (↔ Hover to resize) */}
        <div
          data-resize-handle="true"
          onMouseDown={(e) => handleEdgeResizeStart(e, 'left')}
          className="absolute left-0 top-0 bottom-0 w-3.5 z-50 cursor-ew-resize flex items-center justify-center group"
          title={t('overlayResizeTip')}
        >
          <div className="w-0.5 h-4 rounded-full bg-zinc-700/60 group-hover:bg-zinc-400 transition-colors" />
        </div>

        {/* Right Edge Resize Handle (↔ Hover to resize) */}
        <div
          data-resize-handle="true"
          onMouseDown={(e) => handleEdgeResizeStart(e, 'right')}
          className="absolute right-0 top-0 bottom-0 w-3.5 z-50 cursor-ew-resize flex items-center justify-center group"
          title={t('overlayResizeTip')}
        >
          <div className="w-0.5 h-4 rounded-full bg-zinc-700/60 group-hover:bg-zinc-400 transition-colors" />
        </div>

        {/* Interactive Progress Track Bar & Scrubber Slider */}
        <div
          ref={progressBarRef}
          data-interactive="true"
          onMouseDown={handleSeekMouseDown}
          className="absolute top-0 left-0 right-0 h-3 cursor-pointer group/seek z-40 select-none"
          title={`${t('overlayScrubTip')}: ${formatTime(currentSeconds)} / ${formatTime(state.duration || 0)}`}
        >
          {/* Track Line Background */}
          <div className="w-full h-[2.5px] group-hover/seek:h-[4px] bg-zinc-800 group-hover/seek:bg-zinc-700 transition-all relative overflow-visible">
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
            title={t('overlayDragTip')}
          >
            <GripVertical size={14} />
          </div>

          {/* Track Cover Artwork */}
          <div
            data-interactive="true"
            className="relative shrink-0 cursor-pointer group"
            onClick={handleRestoreApp}
            title={t('overlayRestore')}
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
            title={`${t('overlayDragTip')} • 2x: ${t('overlayRestore')}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate leading-snug">
                {track?.title || t('overlayPlaybackStopped')}
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

          {/* PC System Time Chip (from PC clock) */}
          <div
            data-interactive="true"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800/80 border border-zinc-800/80 text-zinc-300 transition-colors select-none shrink-0"
            title={`${t('systemTime') || 'Время ПК'}: ${pcTimeTooltip}`}
          >
            <Clock size={11} className="shrink-0" style={{ color: accent }} />
            <span className="font-mono text-[11px] font-semibold tracking-tight text-zinc-200">
              {pcTimeFormatted}
            </span>
          </div>

          {/* Media Playback Controls */}
          <div
            data-interactive="true"
            className="flex items-center gap-1.5 shrink-0"
          >
            <button
              onClick={() => handleAction('prev')}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title={t('previous')}
            >
              <SkipBack size={14} fill="currentColor" />
            </button>

            <button
              onClick={() => handleAction('play-pause')}
              className="w-8 h-8 flex items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95 hover:brightness-110"
              style={{ backgroundColor: accent }}
              title={state.isPlaying ? t('pause') : t('play')}
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
              title={t('next')}
            >
              <SkipForward size={14} fill="currentColor" />
            </button>
          </div>

          {/* Right Utility Buttons: Lyrics Toggle, Shape & Speed Settings, Restore, Close */}
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
              title={mode === 'expanded' ? t('overlayCompact') : t('overlayExpanded')}
            >
              <Mic2 size={13} style={mode === 'expanded' ? { color: accent } : undefined} />
            </button>

            {/* Shape & Speed Settings Trigger Button */}
            <button
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all relative ${
                isSettingsOpen
                  ? 'bg-white/20 text-white ring-1 ring-white/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              style={isSettingsOpen ? { color: accent } : undefined}
              title={`${t('overlaySettings') || 'Настройки формы и скорости'}: ${
                shapeStyle === 'pill' ? 'Pill' : 'Squircle'
              } • ${currentSpeed.toFixed(2)}x`}
            >
              <Sliders size={12} />
              {currentSpeed !== 1.0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-black animate-pulse"
                  style={{ backgroundColor: accent }}
                />
              )}
            </button>

            <button
              onClick={handleRestoreApp}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title={t('overlayRestore')}
            >
              <Maximize2 size={12} />
            </button>

            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/10 transition-colors"
              title={t('overlayClose')}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Interactive Shape & Speed Quick Drawer */}
        {isSettingsOpen && (
          <div
            data-interactive="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="px-4 py-2 bg-[#09090b]/98 border-t border-zinc-800/80 flex items-center justify-between gap-3 h-[52px] select-none text-xs backdrop-blur-xl"
          >
            {/* Shape Selector Segmented Control */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mr-0.5">
                {t('overlayShape') || 'Форма'}
              </span>
              <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShapeStyle('pill')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                    shapeStyle === 'pill'
                      ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={shapeStyle === 'pill' ? { borderLeft: `2px solid ${accent}` } : undefined}
                  title={t('overlayShapePill') || 'Капсула'}
                >
                  <span className="inline-block w-2.5 h-1.5 rounded-full border border-current" />
                  <span>Pill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShapeStyle('squircle')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                    shapeStyle === 'squircle'
                      ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={shapeStyle === 'squircle' ? { borderLeft: `2px solid ${accent}` } : undefined}
                  title={t('overlayShapeSquircle') || 'Скругленный'}
                >
                  <span className="inline-block w-2 h-2 rounded-[3px] border border-current" />
                  <span>Box</span>
                </button>
              </div>
            </div>

            <div className="h-5 w-[1px] bg-zinc-800/80 shrink-0" />

            {/* Playback Speed Controller Slider & Presets */}
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 shrink-0">
                <Gauge size={13} style={{ color: accent }} />
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 hidden sm:inline">
                  {t('overlaySpeed') || 'Скорость'}
                </span>
                <span
                  className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 min-w-[44px] text-center"
                  style={{ color: currentSpeed !== 1.0 ? accent : '#e4e4e7' }}
                  title={t('overlaySpeed')}
                >
                  {currentSpeed.toFixed(2)}x
                </span>
              </div>

              {/* Smooth Range Slider */}
              <div className="flex-1 min-w-[80px] flex items-center relative group/speed">
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={currentSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer focus:outline-none"
                  style={{
                    accentColor: accent,
                  }}
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {[0.8, 1.0, 1.25, 1.5].map((preset) => {
                  const isActive = Math.abs(currentSpeed - preset) < 0.02;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSpeedChange(preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        isActive
                          ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                      }`}
                      style={isActive ? { color: preset !== 1.0 ? accent : '#fff' } : undefined}
                    >
                      {preset === 1.0 ? '1x' : `${preset}x`}
                    </button>
                  );
                })}

                {/* Reset to 1.0x if altered */}
                {currentSpeed !== 1.0 && (
                  <button
                    type="button"
                    onClick={() => handleSpeedChange(1.0)}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title={t('speedNormal') || 'Сброс на 1.0x'}
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="w-5 h-5 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
              title="Закрыть настройки"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* Lower Expanded Row: Real-time Synchronized Lyrics */}
        {mode === 'expanded' && (
          <div
            onMouseDown={handleMouseDown}
            className="px-5 py-2.5 bg-black/40 border-t border-zinc-800/60 flex flex-col justify-center min-h-[50px] cursor-grab active:cursor-grabbing"
            title={t('overlayDragTip')}
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
                  {state.track ? t('connecting') : t('overlayPlaybackStopped')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
