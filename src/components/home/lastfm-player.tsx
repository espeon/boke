"use client";
import { useLastFM } from "../../hooks/useLastFM";
import { useEffect } from "react";
import { setBackgroundState } from "../../hooks/useBackgroundState";
import { CrossFade } from "react-crossfade-simple";
import { SmoothImage } from "../SmoothImage";
import { FaLastfm } from "react-icons/fa";
import { LuFileWarning } from "react-icons/lu";

function useQueryParam(param: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param) || undefined;
}

export function LastFMPlayer() {
  const userParam = useQueryParam("user");
  const { data, error } = useLastFM(2500, userParam);

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
      timeout={400}
    >
      <div className="animate-[slideUpFade_0.4s_ease-out]">
        {data ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/60 p-1.5 backdrop-blur-sm dark:bg-neutral-950/60">
            {/* Album Art */}
            <div className="relative flex-shrink-0">
              {data.imageUrl ===
              "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-md border border-gray-300/30 bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-gray-700 dark:border-neutral-600/30 dark:text-gray-400">
                  <LuFileWarning className="text-xl" />
                </div>
              ) : (
                <SmoothImage
                  src={data.imageUrl}
                  base64Src={data.base64Image}
                  alt="Album cover"
                  className="h-16 w-16 rounded-xl border-1 border-gray-300/70 object-cover dark:border-neutral-600/30"
                />
              )}

              {/* Now Playing Indicator */}
              {data.isCurrent && (
                <>
                  <div className="absolute -top-0.5 -right-0.5 z-10 h-2.5 w-2.5 animate-pulse rounded-full bg-red-300 ring-1 ring-white dark:ring-neutral-950"></div>
                  <div className="absolute -top-0.5 -right-0.5 z-0 h-2.5 w-2.5 rounded-full bg-pink-950 ring-1 ring-white dark:ring-neutral-950"></div>
                </>
              )}
            </div>

            {/* Track Info */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-700 dark:text-gray-600">
                  {data.isCurrent ? "now playing" : "last played"} on
                </span>
                <a
                  href="https://www.last.fm/user/kanb"
                  target="_blank"
                  className="text-gray-700 transition-colors hover:text-pink-600 dark:text-gray-800 dark:hover:text-pink-400"
                >
                  <FaLastfm className="text-base" />
                </a>
              </div>

              <a
                href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/_/${encodeURIComponent(data.name)}`}
                target="_blank"
                className="truncate text-base font-semibold text-gray-900 transition-colors hover:text-pink-600 dark:text-gray-100 dark:hover:text-pink-400"
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
          <div className="rounded-lg bg-red-50/40 p-3 backdrop-blur-sm dark:bg-red-950/60">
            <span className="text-red-700 dark:text-red-400">
              {error.message}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-white/40 p-3 backdrop-blur-sm dark:bg-neutral-950/60">
            <div className="h-16 w-16 animate-pulse rounded-md bg-gray-300/50 dark:bg-neutral-700/50"></div>
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
