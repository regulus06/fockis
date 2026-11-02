/* ============================================================================
   STORY MEDIA LINKS
   Uploads land in Google Cloud Storage (posts/images, posts/videos) and the
   upload endpoint returns a *signed* link to the private file. Signed links
   expire and depend on the signer's read access, so a story that saved one
   can stop playing. Stories therefore keep a stable `post-media/<file>` path
   that the API streams itself (PostMediaController: public, Range-capable,
   same route the feed uses for post media).
============================================================================ */

const GCS_HOSTS = /^(?:storage\.googleapis\.com|storage\.cloud\.google\.com)$/i;
const GCS_VIRTUAL_HOST = /^([^.]+)\.storage\.googleapis\.com$/i;
// Exactly the folders PostMediaController looks in (mediaPrefixes).
const SERVED_FOLDERS = ["posts", "posts/images", "posts/videos", "post-media", "stories", "story-media"];

/** "posts/images/123-abc.jpg" → "post-media/123-abc.jpg" (only folders PostMediaController serves). */
export function postMediaPathForKey(key: string): string | null {
  const parts = String(key ?? "").replace(/^\/+/, "").split("/");
  const name = parts.pop() ?? "";
  if (!SERVED_FOLDERS.includes(parts.join("/"))) return null;
  return name && !name.includes("..") ? `post-media/${name}` : null;
}

/**
 * A stable path for story media. Signed Google Cloud links become
 * `post-media/<file>`; anything else is returned unchanged.
 */
export function canonicalStoryMedia(media: unknown): string {
  const value = String(media ?? "").trim();
  if (!/^https?:\/\//i.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  let key = "";
  if (GCS_HOSTS.test(url.hostname)) {
    // https://storage.googleapis.com/<bucket>/<key>
    key = decodeURIComponent(url.pathname.replace(/^\/+/, "")).split("/").slice(1).join("/");
  } else if (GCS_VIRTUAL_HOST.test(url.hostname)) {
    // https://<bucket>.storage.googleapis.com/<key>
    key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } else {
    return value;
  }
  return postMediaPathForKey(key) ?? value;
}
