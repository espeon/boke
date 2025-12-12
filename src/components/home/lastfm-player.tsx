"use client";
import { useLastFM } from "../../hooks/useLastFM";
import { useEffect } from "react";
import { setBackgroundState } from "../../hooks/useBackgroundState";
import { CrossFade } from "react-crossfade-simple";
import { SmoothImage } from "../SmoothImage";
import { FaLastfm } from "react-icons/fa";
import { LuFileWarning } from "react-icons/lu";

export function LastFMPlayer() {
  const { data, error } = useLastFM(2500);

  useEffect(() => {
    const newOpacity = data?.imageUrl ? 0.65 : 0;
    setBackgroundState({
      currentImageUrl: data?.imageUrl,
      backgroundOpacity: newOpacity,
    });
  }, [data?.imageUrl, data]);

  return (
    <CrossFade
      contentKey={
        (data?.isCurrent || "b all") +
        (data?.artist || "abs") +
        (data?.name || "balls")
      }
    >
      <div className="min-h-[7.3rem] sm:min-h-[5.3rem]">
        {data ? (
          <div className="flex items-center gap-4 rounded-xl border border-gray-300/30 bg-white/40 p-4 backdrop-blur-sm dark:border-neutral-600/30 dark:bg-neutral-900/40">
            {/* Album Art */}
            <div className="relative flex-shrink-0">
              {data.imageUrl ===
              "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-300/30 bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-gray-700 dark:border-neutral-600/30 dark:text-gray-400">
                  <LuFileWarning className="text-2xl" />
                </div>
              ) : (
                <SmoothImage
                  src={data.imageUrl}
                  base64Src={data.base64Image}
                  alt="Album cover"
                  className="h-20 w-20 rounded-lg border border-gray-300/20 object-cover dark:border-neutral-600/30"
                />
              )}

              {/* Now Playing Indicator */}
              {data.isCurrent && (
                <div className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-pink-600 ring-2 ring-white dark:ring-neutral-900"></div>
              )}
            </div>

            {/* Track Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-end-safe gap-1.5">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {data.isCurrent ? "now playing" : "last played"} on
                </span>
                <a
                  href="https://www.last.fm/user/kanb"
                  target="_blank"
                  className="mb-0.15 text-gray-600 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400"
                >
                  <FaLastfm className="text-sm" />
                </a>
              </div>

              <a
                href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/_/${encodeURIComponent(data.name)}`}
                target="_blank"
                className="truncate font-semibold text-gray-900 transition-colors hover:text-pink-600 dark:text-gray-100 dark:hover:text-pink-400"
              >
                {data.name}
              </a>

              <a
                href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/`}
                target="_blank"
                className="truncate text-sm text-gray-700 transition-colors hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400"
              >
                {data.artist}
              </a>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-300/30 bg-red-50/40 p-4 backdrop-blur-sm dark:border-red-600/30 dark:bg-red-900/20">
            <span className="text-red-700 dark:text-red-400">
              {error.message}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-gray-300/30 bg-white/40 p-4 backdrop-blur-sm dark:border-neutral-600/30 dark:bg-neutral-900/40">
            <div className="h-20 w-20 animate-pulse rounded-lg bg-gray-300/50 dark:bg-neutral-700/50"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-300/50 dark:bg-neutral-700/50"></div>
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-300/50 dark:bg-neutral-700/50"></div>
            </div>
          </div>
        )}
      </div>
    </CrossFade>
  );
}
