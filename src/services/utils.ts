export function formatRelativeTime(date?: string): string {
  if (!date) return '';
  const ts = new Date(date).getTime();
  if (isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week === 1 ? '' : 's'} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month === 1 ? '' : 's'} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year === 1 ? '' : 's'} ago`;
}

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
