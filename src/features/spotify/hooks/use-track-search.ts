'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/http';
import type { SpotifyTrack } from '@/types/music';

type SearchState = {
  query: string;
  tracks: SpotifyTrack[];
  error: string;
  pending: boolean;
};
export function useTrackSearch(value: string, enabled: boolean) {
  const query = value.trim();
  const active = enabled && query.length >= 2;
  const [result, setResult] = useState<SearchState>({
    query: '',
    tracks: [],
    error: '',
    pending: false,
  });
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setResult({ query, tracks: [], error: '', pending: true });
      api<{ tracks: SpotifyTrack[] }>(
        `/api/search?q=${encodeURIComponent(query)}`,
        undefined,
        'GET',
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted)
            setResult({
              query,
              tracks: data.tracks,
              error: '',
              pending: false,
            });
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted)
            setResult({
              query,
              tracks: [],
              error: error.message,
              pending: false,
            });
        });
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [active, query]);
  const current = active && result.query === query;
  return {
    tracks: current ? result.tracks : [],
    searchError: current ? result.error : '',
    searching: active && (!current || result.pending),
  };
}
