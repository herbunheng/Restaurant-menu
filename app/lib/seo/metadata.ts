import { seoConfig } from "./config";

interface MetadataOptions {
  title?: string;
  description?: string;
  image?: string;
}

/**
 * Nuxt 4 SEO metadata composable helper.
 * Call from any component/page setup.
 */
export function useAppSeo(options: MetadataOptions = {}) {
  const fullTitle = options.title ? `${options.title} | ${seoConfig.siteName}` : seoConfig.defaultTitle;
  const description = options.description ?? seoConfig.defaultDescription;
  const image = options.image ?? seoConfig.defaultImage;

  useSeoMeta({
    title: fullTitle,
    description,
    ogTitle: fullTitle,
    ogDescription: description,
    ogImage: image,
    twitterCard: "summary_large_image",
    twitterTitle: fullTitle,
    twitterDescription: description,
    twitterImage: image,
  });
}
