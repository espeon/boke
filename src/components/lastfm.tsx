import { Suspense, useEffect } from "react";
import { CrossFade } from "react-crossfade-simple";
import { useLastFM } from "../hooks/useLastFm";

export function LastFM() {
  const { data, error, loading } = useLastFM(10000);

  return (
    <CrossFade
      contentKey={
        (data?.isCurrent || "b all") +
        (data?.artist || "abs") +
        (data?.name || "balls")
      }
    >
      <div className="flex items-center gap-3">
        <img className="rounded-lg object-cover size-16 ambilight" src={data?.imageUrl} alt={`${data?.artist} - ${data?.name}`} />
        <div>
          <p className="">{data?.name}</p>
          <p className="text-muted-foreground">{data?.artist}</p>
        </div>
      </div>
    </CrossFade>);
};
