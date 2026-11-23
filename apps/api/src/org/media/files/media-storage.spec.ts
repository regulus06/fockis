import { contentTypeFor, isValidMediaRef, objectKeyFor, parseMediaUrl, parseRange } from "./media-storage.service";

describe("organization media storage helpers", () => {
  const org = "6af924931e00f42af01d9a27";
  const name = `${org}-1794714662440-bab1cc4c.mp4`;

  it("parses library URLs and rejects anything else", () => {
    expect(parseMediaUrl(`/uploads/organization-media/${org}/${name}`)).toEqual({ orgId: org, name });
    expect(parseMediaUrl(`/uploads/organization-media/${org}/../secret.txt`)).toBeNull();
    expect(parseMediaUrl(`/uploads/music/${org}/${name}`)).toBeNull();
    expect(parseMediaUrl("https://example.com/a.mp4")).toBeNull();
    expect(parseMediaUrl(null)).toBeNull();
  });

  it("builds bucket keys inside the organization folder", () => {
    expect(objectKeyFor(org, name)).toBe(`organization-media/${org}/${name}`);
    expect(isValidMediaRef(org, name)).toBe(true);
    expect(isValidMediaRef("not-an-id", name)).toBe(false);
    expect(isValidMediaRef(org, "evil.html")).toBe(false);
  });

  it("serves the right content types", () => {
    expect(contentTypeFor(name)).toBe("video/mp4");
    expect(contentTypeFor("x.PNG")).toBe("image/png");
    expect(contentTypeFor("x.bin")).toBe("application/octet-stream");
  });

  it("parses byte ranges for video seeking", () => {
    expect(parseRange(undefined, 1000)).toBeNull();
    expect(parseRange("bytes=0-", 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=100-199", 1000)).toEqual({ start: 100, end: 199 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=1000-", 1000)).toBe("invalid");
    expect(parseRange("bytes=5-2", 1000)).toBe("invalid");
    expect(parseRange("items=0-1", 1000)).toBe("invalid");
  });
});
