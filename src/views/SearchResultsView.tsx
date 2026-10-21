import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Music, Disc } from 'lucide-react';
import { Track } from '@/types';
import { soundcloudApi } from '@/services/api';
import { Tabs } from '@/components/ui/Tabs';
import { TrackRow } from '@/components/ui/TrackRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

interface SearchResultsViewProps {
  onPlayTrack: (track: Track, list?: Track[]) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onLikeTrack: (track: Track) => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  onPlayTrack,
  currentTrack,
  isPlaying,
  onLikeTrack,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setTracks([]);
      return;
    }

    let isCancelled = false;
    const runSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await soundcloudApi.searchTracks(query, 50);
        if (!isCancelled) {
          setTracks(results);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Search failed');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    runSearch();
    return () => {
      isCancelled = true;
    };
  }, [query]);

  const tabs = [
    { id: 'tracks', label: 'Tracks', count: tracks.length },
    { id: 'playlists', label: 'Playlists' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      <div className="border-b border-[#242424] pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Search size={20} className="text-[#ff5500]" />
          <span>Search results for:</span>
          <span className="text-[#ff5500]">"{query}"</span>
        </h1>
        <p className="text-xs text-[#888888] mt-1">
          Found {tracks.length} tracks matching your query.
        </p>
      </div>

      <Tabs
        items={tabs}
        activeId={activeTab}
        onChange={(id) => {
          if (id === 'playlists') {
            navigate('/playlists');
          } else {
            setActiveTab('tracks');
          }
        }}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-[#181818]">
              <Skeleton className="w-10 h-10 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="w-12 h-3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => soundcloudApi.searchTracks(query, 50)} />
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={<Music size={28} />}
          title={`No tracks found for "${query}"`}
          description="Check your spelling or try different keywords or artist names."
        />
      ) : (
        <div className="space-y-1 bg-[#141414] rounded-lg border border-[#222222] p-2">
          {tracks.map((track, index) => (
            <TrackRow
              key={`${track.id}-${index}`}
              track={track}
              index={index}
              showIndex={true}
              isActive={currentTrack?.id === track.id}
              isPlaying={isPlaying && currentTrack?.id === track.id}
              onPlay={() => onPlayTrack(track, tracks)}
              onLike={() => onLikeTrack(track)}
              onArtistClick={(artist) => navigate(`/artist/${encodeURIComponent(artist)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
