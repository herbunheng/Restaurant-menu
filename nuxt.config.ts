import { fileURLToPath } from "node:url";
import pkg from "./package.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxtjs/seo",
  ],

  alias: {
    "@restaurant-menu/shared": fileURLToPath(new URL("./shared", import.meta.url)),
  },

  // Site Configuration for SEO & Sitemap
  site: {
    url:
      process.env.NUXT_PUBLIC_SITE_URL &&
      process.env.NUXT_PUBLIC_SITE_URL !== "http://localhost:3000"
        ? process.env.NUXT_PUBLIC_SITE_URL
        : "https://restaurant-menu.pages.dev",
    name: pkg.appName || "Restaurant Menu",
    description:
      "A modern full-stack restaurant menu application powered by Nuxt 4, Vue 3, and Cloudflare.",
    defaultLocale: "en",
  },

  // Link Checker configuration to ignore admin routes
  linkChecker: {
    excludeLinks: ["/admin", "/admin/**"],
    failOnError: false,
  },

  // Runtime Configuration exposed to Vue components via useRuntimeConfig()
  runtimeConfig: {
    apiUploadImg: process.env.NUXT_API_UPLOAD_IMG || "",
    apiUploadKey: process.env.API_KEY || process.env.NUXT_API_UPLOAD_KEY || "",
    apiBypassKey: process.env.API_BYPASS_KEY || "",
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "",
      apiUploadImg: process.env.NUXT_API_UPLOAD_IMG || process.env.NUXT_PUBLIC_API_UPLOAD_IMG || "",
      apiUploadKey: process.env.API_KEY || process.env.NUXT_API_UPLOAD_KEY || "",
      siteUrl:
        process.env.NUXT_PUBLIC_SITE_URL &&
        process.env.NUXT_PUBLIC_SITE_URL !== "http://localhost:3000"
          ? process.env.NUXT_PUBLIC_SITE_URL
          : "https://restaurant-menu.pages.dev",
      siteName: pkg.appName || "Restaurant Menu",
      appName: pkg.appName || "Restaurant Menu",
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      vapidPublicKey: process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    },
  },

  // Robots.txt Configuration
  robots: {
    disallow: ["/admin"],
    sitemap: "/sitemap.xml",
  },

  // Sitemap Configuration
  sitemap: {
    autoLastmod: true,
  },

  devtools: {
    enabled: true,
  },

  devServer: {
    port: 3001,
  },

  css: ["~/assets/css/main.css"],

  nitro: {
    prerender: {
      routes: ["/", "/explore", "/pricing", "/sitemap.xml", "/robots.txt"],
      ignore: ["/admin"],
    },
  },

  routeRules: {
    "/": { prerender: true },
    "/explore": { prerender: true },
    "/pricing": { prerender: true },
    "/sitemap.xml": { prerender: true },
    "/robots.txt": { prerender: true },
  },

  compatibilityDate: "2026-06-30",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },
});
