export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function genWaveform(seed: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < 60; i++) {
    const v = Math.sin(i * 0.3 + seed) * 0.3 + Math.cos(i * 0.15 + seed * 2) * 0.2 + 0.5;
    bars.push(Math.max(0.15, Math.min(1, v + Math.sin(i * 1.7 + seed) * 0.15)));
  }
  return bars;
}
