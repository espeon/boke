import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  const posts = await getCollection("posts");
  // disclude posts that are not published
  const p = posts.filter((post) => post.data.draft === false);
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: p.map((post) => ({
      ...post.data,
      link: `/posts/${post.slug}/`,
    })),
  });
}
