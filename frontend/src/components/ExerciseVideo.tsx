import { useEffect, useState } from "react";
import { Play, VideoOff } from "lucide-react";

const youtubeId = (media?: string) => {
  if (!media) return null;
  const value = media.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let candidate = "";
    if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
      if (url.pathname === "/watch") candidate = url.searchParams.get("v") ?? "";
      else candidate = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
};

export function ExerciseVideo({ exerciseName, mediaUrl }: { exerciseName: string; mediaUrl?: string }) {
  const videoId = youtubeId(mediaUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [videoId]);

  if (!videoId || failed) return <div className="grid aspect-video place-items-center rounded-[24px] bg-[#f4f4f1] px-6 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-[18px] bg-white text-muted"><VideoOff size={20}/></span><p className="mt-4 font-bold text-ink">Video demonstration unavailable</p><p className="mt-1 text-xs leading-5 text-muted">Use the written instructions below and choose a comfortable, controlled range of motion.</p></div></div>;

  return <div className="relative aspect-video overflow-hidden rounded-[24px] bg-[#171717] shadow-sm">
    <div className="pointer-events-none absolute inset-0 grid place-items-center text-white/30"><Play size={32}/></div>
    <iframe
      className="relative h-full w-full border-0"
      src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
      title={`${exerciseName} video demonstration`}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      onError={() => setFailed(true)}
    />
  </div>;
}
