import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";

import { SITE_URL } from "./src/consts";

import tailwindcss from "@tailwindcss/vite";
import remarkCallouts from "./src/lib/remark-callouts.mjs";
import remarkMarginNotes from "./src/lib/remark-margin-notes.mjs";

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [mdx(), sitemap(), react()],
  markdown: {
    remarkPlugins: [remarkMarginNotes, remarkCallouts],
    shikiConfig: {
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-mocha",
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
