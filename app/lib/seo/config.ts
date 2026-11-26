import pkg from "../../../package.json";

export const seoConfig = {
  siteName: pkg.appName || "Restaurant Menu",
  siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
  defaultTitle: `${pkg.appName || "AppBrand"} | Full-Stack Monorepo Starter Template`,
  defaultDescription:
    "A generic modern full-stack starter template powered by Nuxt 4, Vue 3, Hono, and Cloudflare Workers.",
  defaultImage: "/og-image.png",
  twitterHandle: "@appbrand",
  keywords: [
    "Nuxt 4",
    "Vue 3",
    "Hono",
    "Cloudflare Workers",
    "TypeScript",
    "Monorepo",
    "pnpm workspace",
  ],
};
