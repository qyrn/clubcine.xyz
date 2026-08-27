import { MetadataRoute } from "next";

const BASE_URL = "https://clubcine.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "always", priority: 1 },
    { url: `${BASE_URL}/movie`, changeFrequency: "always", priority: 1 },
    { url: `${BASE_URL}/programme`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/soirees`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/soutiens`, changeFrequency: "weekly", priority: 0.4 },
  ];
}
