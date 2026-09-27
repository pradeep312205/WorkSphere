const localApiUrl = "http://localhost:5000/api";

const configuredApiUrl = (import.meta.env.VITE_API_URL || localApiUrl).replace(/\/+$/, "");
export const API_URL = /\/api$/i.test(configuredApiUrl) ? configuredApiUrl : `${configuredApiUrl}/api`;
export const API_ORIGIN = API_URL.replace(/\/api$/i, "");

export function apiAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
