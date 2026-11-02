import { canonicalStoryMedia, postMediaPathForKey } from "./story-media";

describe("story media links", () => {
  it("turns signed Google Cloud links into post-media paths", () => {
    const signed =
      "https://storage.googleapis.com/fockis-media/posts/images/1793570000000-6f1c2a.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=x&X-Goog-Expires=604800&X-Goog-Signature=abc";
    expect(canonicalStoryMedia(signed)).toBe("post-media/1793570000000-6f1c2a.jpg");
    expect(canonicalStoryMedia("https://fockis-media.storage.googleapis.com/posts/videos/17935-a.mp4?X-Goog-Signature=1")).toBe("post-media/17935-a.mp4");
  });

  it("leaves other links and paths alone", () => {
    expect(canonicalStoryMedia("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(canonicalStoryMedia("post-media/a.jpg")).toBe("post-media/a.jpg");
    expect(canonicalStoryMedia("https://storage.googleapis.com/b/private/other/a.jpg")).toBe("https://storage.googleapis.com/b/private/other/a.jpg");
  });

  it("only maps folders the media route serves", () => {
    expect(postMediaPathForKey("posts/images/a.jpg")).toBe("post-media/a.jpg");
    expect(postMediaPathForKey("posts/thumbnails/a.jpg")).toBeNull();
    expect(postMediaPathForKey("music/a.mp3")).toBeNull();
  });
});
