const rawApiUrl = process.env.MONLINE_API_URL;

if (
  rawApiUrl &&
  rawApiUrl.startsWith("http://") && 
  !rawApiUrl.includes("localhost") && 
  !rawApiUrl.includes("127.0.0.1")
) {
  console.warn(
    "[MangaStoon Security Warning]: MONLINE_API_URL is using an insecure HTTP protocol ('" + 
    rawApiUrl + 
    "'). Ensure SSL/TLS is enabled in production."
  );
}

export const MONLINE_API_URL = (rawApiUrl || "http://46.224.213.127:8085").replace(/\/$/, "");
