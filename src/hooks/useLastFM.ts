"use client";
import { useState, useEffect, useRef } from "react";

interface Track {
  name: string;
  artist: string;
  imageUrl: string;
  base64Image?: string;
  isCurrent: boolean;
}

const FM_KEY = "6f5ff9d828991a85bd78449a85548586";
const MAIN = "kanb";
const STORAGE_KEY = "lastfm-data";

// Convert image URL to base64
const imageToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

const fetchTrack = async (user = MAIN): Promise<Track> => {
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${FM_KEY}&limit=1&format=json`,
  );
  const data = await res.json();
  let recentTrack = data?.recenttracks.track[0];

  // Get 64x64 image for base64 caching (index 1 is usually 64x64, index 0 is 34x34)
  const smallImageUrl = recentTrack.image[1]?.["#text"];
  const base64Image = smallImageUrl ? await imageToBase64(smallImageUrl) : null;

  return {
    name: recentTrack.name,
    artist: recentTrack.artist["#text"],
    imageUrl: recentTrack.image[recentTrack.image.length - 1]["#text"],
    base64Image: base64Image || undefined,
    isCurrent: recentTrack["@attr"]?.nowplaying == "true",
  };
};

// Storage helpers
const saveToStorage = (data: Track) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    // Storage not available, ignore
  }
};

const loadFromStorage = (): Track | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const { data, timestamp } = JSON.parse(stored);
    // Don't use data older than 60 seconds (longer since we have base64 cache)
    if (Date.now() - timestamp > 60000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
};

// Global state shared between all instances
let globalData: Track | null = loadFromStorage();
let globalError: Error | null = null;
let globalLoading: boolean = globalData === null;
let subscribers: Set<() => void> = new Set();
let fetchInterval: NodeJS.Timeout | null = null;
let currentIntervalMs: number = 10000;

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const startGlobalFetching = (intervalMs: number, user?: string) => {
  // Only restart if interval changed or not running
  if (fetchInterval && currentIntervalMs === intervalMs) {
    return;
  }

  if (fetchInterval) {
    clearInterval(fetchInterval);
  }

  currentIntervalMs = intervalMs;

  const getData = async () => {
    try {
      const track = await fetchTrack(user);
      globalData = track;
      globalError = null;
      globalLoading = false;
      saveToStorage(track);
      notifySubscribers();
    } catch (err: any) {
      globalError = err;
      globalLoading = false;
      notifySubscribers();
    }
  };

  // Fetch immediately if we don't have data
  if (globalData === null) {
    getData();
  }

  fetchInterval = setInterval(getData, intervalMs);
};

const stopGlobalFetching = () => {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
  }
};

export function useLastFM(intervalMs: number = 10000, user = MAIN) {
  const [, forceUpdate] = useState({});
  const subscriberRef = useRef<() => void | undefined>(undefined);

  useEffect(() => {
    // Create subscriber function
    subscriberRef.current = () => {
      forceUpdate({});
    };

    // Add to subscribers
    subscribers.add(subscriberRef.current);

    // Start or update fetching
    startGlobalFetching(intervalMs, user);

    // Cleanup
    return () => {
      if (subscriberRef.current) {
        subscribers.delete(subscriberRef.current);
      }

      // Stop fetching if no more subscribers
      if (subscribers.size === 0) {
        stopGlobalFetching();
      }
    };
  }, [intervalMs, user]);

  return {
    data: globalData,
    error: globalError,
    loading: globalLoading,
  };
}

export type { Track };
