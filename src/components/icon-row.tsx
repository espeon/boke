import { IoLogoTwitch } from "react-icons/io";
import {
  FaGithub,
  FaTwitch,
  FaBluesky,
  FaDiscord,
  FaLastfm,
} from "react-icons/fa6";

export function IconRow() {
  let icons = [
    { i: <FaGithub />, url: "https://github.com/espeon" },
    { i: <FaBluesky />, url: "https://bsky.app/profile/natalie.sh" },
    { i: <IoLogoTwitch />, url: "https://twitch.tv/uxieq" },
    { i: <FaLastfm />, url: "https://last.fm/user/kanb" },
    { i: <FaDiscord />, url: "https://discord.gg/pgGM9n8ppf" },
  ];
  return (
    <div className="flex py-2" style={{ fontSize: "1.75rem" }}>
      {icons.map((e) => {
        return (
          <div
            className="pr-[.25em] text-gray-700 dark:text-gray-400"
            key={e.url}
          >
            <a href={e.url}>{e.i}</a>
          </div>
        );
      })}
    </div>
  );
}
