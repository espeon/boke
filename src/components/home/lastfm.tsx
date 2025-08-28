"use client";
import { useLastFM } from "../../hooks/useLastFM";
import { ScrollingText } from "../scrolling-text";
import { CrossFade } from "react-crossfade-simple";
import { FaLastfm } from "react-icons/fa";
import { LuExternalLink, LuFileWarning } from "react-icons/lu";
import { SmoothImage } from "../SmoothImage";
import { useEffect } from "react";
import { setBackgroundState } from "../../hooks/useBackgroundState";

const MAIN = "kanb";

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
      contentKey={(data?.name || "abc") + data?.artist + data?.imageUrl}
      timeout={600}
    >
      {data ? (
        <div className="justify-left group flex h-full w-[95vw] max-w-screen min-w-full flex-row items-center overflow-visible xl:max-w-lg">
          <div className="h-20 overflow-visible">
            {data.imageUrl ===
            "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" ? (
              <div className="margin-auto ambilight z-20 mr-4 flex h-20 w-20 flex-col items-center justify-center self-center overflow-visible rounded-lg border border-gray-300/20 bg-pink-500/30 text-center text-sm text-gray-700 contain-content dark:border-neutral-600/30 dark:text-gray-400">
                <LuFileWarning className="mb-1 text-2xl" />
                <p>No cover found!</p>
              </div>
            ) : (
              <SmoothImage
                src={data.imageUrl}
                base64Src={data.base64Image}
                alt="cover"
                className="margin-auto ambilight z-20 mr-4 max-h-20 max-w-20 self-center overflow-visible rounded-lg border border-gray-500/20 contain-content dark:border-neutral-600/30"
              />
            )}
          </div>
          <div className="items-left flex w-min max-w-[calc(95%-6rem)] flex-col justify-center leading-normal">
            <div className="flex max-w-screen justify-between lg:min-w-sm">
              <div className="w-max text-left text-sm text-gray-600 dark:text-gray-400">
                {data.isCurrent ? "Now Playing" : "Last Played"} on{" "}
                <a href={`https://www.last.fm/user/${MAIN}`} target="_blank">
                  <FaLastfm className="hover:text-wisteria-500 dark:hover:text-wisteria-200 mb-0.5 inline text-base transition-colors duration-150" />
                </a>
              </div>
              <a
                href="/lfm"
                className="opacity-0 duration-150 group-hover:opacity-100"
              >
                <LuExternalLink />
              </a>
            </div>
            <a
              href={`https://www.last.fm/music/${data.artist}/_/${data.name}`}
              target="_blank"
            >
              <ScrollingText
                className="hover:text-wisteria-500 dark:hover:text-wisteria-200 transition-colors duration-150"
                text={`${data.name}`}
              />
            </a>
            <a
              href={`https://www.last.fm/music/${data.artist}/`}
              target="_blank"
            >
              <ScrollingText
                className="hover:text-wisteria-500 dark:hover:text-wisteria-200 transition-colors duration-150"
                text={`${data.artist}`}
              />
            </a>
          </div>
        </div>
      ) : error ? (
        <div className="flex w-min max-w-[calc(95%-8rem)] flex-col items-center justify-center">
          <div className="text-left text-sm text-gray-400">{error.message}</div>
        </div>
      ) : (
        <div className="flex h-20 w-screen max-w-lg flex-col items-center justify-center">
          <div className="text-sm text-gray-400">Loading...</div>
          <noscript>
            <div className="text-sm text-gray-400">
              You'll need to enable JavaScript to view this content.
            </div>
          </noscript>
        </div>
      )}
    </CrossFade>
  );
}
