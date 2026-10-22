import { Track } from '@/types';

export interface QueueState {
  items: Track[];
  currentIndex: number;
  history: number[];
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  originalOrder: Track[];
}

type Listener = (state: QueueState) => void;

class QueueService {
  private state: QueueState = {
    items: [],
    currentIndex: -1,
    history: [],
    shuffle: false,
    repeat: 'off',
    originalOrder: [],
  };

  private listeners: Set<Listener> = new Set();

  public getState(): QueueState {
    return { ...this.state };
  }

  public getCurrentTrack(): Track | null {
    if (this.state.currentIndex >= 0 && this.state.currentIndex < this.state.items.length) {
      return this.state.items[this.state.currentIndex];
    }
    return null;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getState();
    for (const listener of this.listeners) {
      listener(current);
    }
  }

  public play(track: Track, list?: Track[]): Track {
    const sourceList = list && list.length > 0 ? [...list] : [track];
    let items = [...sourceList];
    let idx = items.findIndex((t) => t.id === track.id);
    if (idx === -1) {
      items.unshift(track);
      idx = 0;
    }

    this.state.originalOrder = [...items];

    if (this.state.shuffle) {
      const rest = items.filter((_, i) => i !== idx);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      this.state.items = [track, ...rest];
      this.state.currentIndex = 0;
    } else {
      this.state.items = items;
      this.state.currentIndex = idx;
    }

    this.state.history.push(track.id);
    this.notify();
    return track;
  }

  public enqueue(track: Track): void {
    this.state.items.push(track);
    this.state.originalOrder.push(track);
    if (this.state.currentIndex === -1) {
      this.state.currentIndex = 0;
    }
    this.notify();
  }

  public enqueueNext(track: Track): void {
    const insertIdx = this.state.currentIndex + 1;
    this.state.items.splice(insertIdx, 0, track);
    this.state.originalOrder.splice(insertIdx, 0, track);
    if (this.state.currentIndex === -1) {
      this.state.currentIndex = 0;
    }
    this.notify();
  }

  public remove(index: number): void {
    if (index < 0 || index >= this.state.items.length) return;
    this.state.items.splice(index, 1);
    if (index < this.state.currentIndex) {
      this.state.currentIndex -= 1;
    } else if (index === this.state.currentIndex) {
      if (this.state.currentIndex >= this.state.items.length) {
        this.state.currentIndex = this.state.items.length - 1;
      }
    }
    this.notify();
  }

  public clear(): void {
    const current = this.getCurrentTrack();
    if (current) {
      this.state.items = [current];
      this.state.originalOrder = [current];
      this.state.currentIndex = 0;
    } else {
      this.state.items = [];
      this.state.originalOrder = [];
      this.state.currentIndex = -1;
    }
    this.notify();
  }

  public next(forceSkipRepeat = false): Track | null {
    if (this.state.items.length === 0) return null;

    if (!forceSkipRepeat && this.state.repeat === 'one' && this.state.currentIndex >= 0) {
      return this.state.items[this.state.currentIndex];
    }

    const nextIndex = this.state.currentIndex + 1;
    if (nextIndex < this.state.items.length) {
      this.state.currentIndex = nextIndex;
      const track = this.state.items[nextIndex];
      this.state.history.push(track.id);
      this.notify();
      return track;
    }

    if ((this.state.repeat === 'all' || forceSkipRepeat) && this.state.items.length > 0) {
      this.state.currentIndex = 0;
      const track = this.state.items[0];
      this.state.history.push(track.id);
      this.notify();
      return track;
    }

    return null;
  }

  public prev(forceSkipRepeat = false): Track | null {
    if (this.state.items.length === 0) return null;

    const prevIndex = this.state.currentIndex - 1;
    if (prevIndex >= 0) {
      this.state.currentIndex = prevIndex;
      const track = this.state.items[prevIndex];
      this.notify();
      return track;
    }

    if ((this.state.repeat === 'all' || forceSkipRepeat) && this.state.items.length > 0) {
      this.state.currentIndex = this.state.items.length - 1;
      const track = this.state.items[this.state.currentIndex];
      this.notify();
      return track;
    }

    return null;
  }

  public setShuffle(enabled: boolean): void {
    if (this.state.shuffle === enabled) return;
    this.state.shuffle = enabled;

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) {
      this.notify();
      return;
    }

    if (enabled) {
      const rest = this.state.items.filter((t) => t.id !== currentTrack.id);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      this.state.items = [currentTrack, ...rest];
      this.state.currentIndex = 0;
    } else {
      this.state.items = [...this.state.originalOrder];
      const idx = this.state.items.findIndex((t) => t.id === currentTrack.id);
      this.state.currentIndex = idx >= 0 ? idx : 0;
    }

    this.notify();
  }

  public cycleRepeat(): 'off' | 'one' | 'all' {
    if (this.state.repeat === 'off') {
      this.state.repeat = 'all';
    } else if (this.state.repeat === 'all') {
      this.state.repeat = 'one';
    } else {
      this.state.repeat = 'off';
    }
    this.notify();
    return this.state.repeat;
  }
}

export const queueService = new QueueService();
