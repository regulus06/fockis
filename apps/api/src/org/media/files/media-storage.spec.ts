import { contentTypeFor, isValidMediaRef, objectKeyFor, parseMediaUrl } from "./media-storage.service";

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
});
