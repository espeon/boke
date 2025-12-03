"use client";
import { useLastFM } from "../../hooks/useLastFM";
import { useEffect } from "react";
import { setBackgroundState } from "../../hooks/useBackgroundState";
import { CrossFade } from "react-crossfade-simple";

export function LastFM() {
  const { data, error, loading } = useLastFM(10000);

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
      <div className="min-h-[7.3rem] text-gray-600 sm:min-h-[5.3rem] dark:text-gray-300">
        {data ? (
          <span>
            I like music a considerable amount.{" "}
            {data.isCurrent ? "Right now, I'm playing" : "I recently played"}{" "}
            <a
              href={`https://www.last.fm/music/${data.artist}/_/${data.name}`}
              target="_blank"
              className="hover:text-gray-800 dark:hover:text-gray-100"
            >
              {data.name}
            </a>{" "}
            by{" "}
            <a
              href={`https://www.last.fm/music/${data.artist}/`}
              target="_blank"
              className="hover:text-gray-900 dark:hover:text-gray-200"
            >
              {data.artist}
            </a>
            .{" "}
            <a
              href="/lfm"
              className="font-normal no-underline transition-colors hover:text-sky-700 dark:hover:text-sky-200"
            >
              The background
            </a>{" "}
            is based on the album art from what{" "}
            {data.isCurrent ? "I'm listening to" : "I've last listened to"}.
          </span>
        ) : error ? (
          <span>{error.message}</span>
        ) : (
          <span>I like music a considerable amount.</span>
        )}
      </div>
    </CrossFade>
  );
}
