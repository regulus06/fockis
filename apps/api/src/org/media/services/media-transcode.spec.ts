import { execFileSync } from "child_process";
import { mkdtempSync, existsSync, mkdirSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { ffmpegArgs, parseProbe, planConversion } from "./media-transcode.service";

const IPHONE_PROBE = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'IMG_0412.MOV':
  Duration: 00:03:38.12, start: 0.000000, bitrate: 8123 kb/s
  Stream #0:0[0x1](und): Video: hevc (Main) (hvc1 / 0x31637668), yuv420p(tv, bt709), 1920x1080, 7900 kb/s, 29.98 fps (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 173 kb/s (default)
  Stream #0:2[0x3](und): Data: none (mebx / 0x7862656D), 0 kb/s (default)`;

describe("video probe and plan", () => {
  it("reads codec, audio and duration from ffmpeg output", () => {
    expect(parseProbe(IPHONE_PROBE)).toEqual({
      videoCodec: "hevc",
      audioCodec: "aac",
      durationSeconds: 218,
      container: "mov,mp4,m4a,3gp,3g2,mj2",
    });
  });

  it("converts HEVC, re-packages H.264 .mov and leaves browser-ready files alone", () => {
    expect(planConversion({ videoCodec: "hevc", audioCodec: "aac", durationSeconds: 1, container: "mov" }, "a.mov")).toBe("transcode");
    expect(planConversion({ videoCodec: "hevc", audioCodec: "aac", durationSeconds: 1, container: "mov" }, "a.mp4")).toBe("transcode");
    expect(planConversion({ videoCodec: "h264", audioCodec: "aac", durationSeconds: 1, container: "mov" }, "a.mov")).toBe("remux");
    expect(planConversion({ videoCodec: "h264", audioCodec: "pcm_s16le", durationSeconds: 1, container: "mov" }, "a.mp4")).toBe("remux");
    expect(planConversion({ videoCodec: "h264", audioCodec: "aac", durationSeconds: 1, container: "mov" }, "a.mp4")).toBe("none");
    expect(planConversion({ videoCodec: "vp9", audioCodec: "opus", durationSeconds: 1, container: "webm" }, "a.webm")).toBe("none");
    expect(planConversion({ videoCodec: null, audioCodec: null, durationSeconds: null, container: null }, "a.mov")).toBe("none");
  });

  it("builds fast-start MP4 commands", () => {
    const t = ffmpegArgs("transcode", "in.mov", "out.mp4", "aac");
    expect(t).toEqual(expect.arrayContaining(["libx264", "+faststart", "yuv420p"]));
    const r = ffmpegArgs("remux", "in.mov", "out.mp4", "aac");
    expect(r).toEqual(expect.arrayContaining(["-c:v", "copy", "-c:a", "copy"]));
    expect(ffmpegArgs("remux", "in.mov", "out.mp4", null)).toContain("-an");
  });
});

// Real conversion with the system ffmpeg (skipped where ffmpeg/libx265 is missing).
let ffmpegAvailable = false;
try {
  ffmpegAvailable = execFileSync("ffmpeg", ["-hide_banner", "-encoders"]).toString().includes("libx265");
} catch {
  ffmpegAvailable = false;
}

(ffmpegAvailable ? describe : describe.skip)("MediaTranscodeService with real ffmpeg", () => {
  const orgId = "6af924931e00f42af01d9a27";
  const mediaId = "6b0000000000000000000001";
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "fockis-media-"));
    process.chdir(root);
    mkdirSync(join(root, "uploads", "organization-media", orgId), { recursive: true });
  });

  function fakeModel(doc: any) {
    const exec = (value: any) => ({ exec: async () => value, lean: () => ({ exec: async () => value }) });
    return {
      doc,
      findOneAndUpdate: (filter: any, update: any) => {
        if (doc.processingStatus !== filter.processingStatus) return exec(null);
        Object.assign(doc, update.$set);
        doc.processingAttempts = (doc.processingAttempts ?? 0) + 1;
        return exec(doc);
      },
      updateOne: async (filter: any, update: any) => {
        if (filter.fileUrl && filter.fileUrl !== doc.fileUrl) return { modifiedCount: 0 };
        Object.assign(doc, update.$set);
        return { modifiedCount: 1 };
      },
      exists: async () => null,
    } as any;
  }

  it("turns an iPhone-style HEVC .mov into a playable H.264 MP4 with a thumbnail", async () => {
    const name = `${orgId}-1763850000000-abcdef12.mov`;
    const input = join(root, "uploads", "organization-media", orgId, name);

    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "testsrc=size=1080x1920:rate=30:duration=3",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
      "-c:v", "libx265", "-tag:v", "hvc1", "-c:a", "aac", "-shortest", input,
    ]);

    process.env.FFMPEG_PATH = "ffmpeg";
    // Import after chdir so the upload root points at the temp folder.
    let MediaTranscodeService: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      MediaTranscodeService = require("./media-transcode.service").MediaTranscodeService;
    });

    const doc: any = {
      _id: mediaId,
      organizationId: orgId,
      mediaType: "video",
      fileUrl: `/uploads/organization-media/${orgId}/${name}`,
      fileName: "IMG_0412.MOV",
      thumbnailUrl: null,
      durationSeconds: null,
      processingStatus: "pending",
      processingAttempts: 0,
    };

    const service = new MediaTranscodeService(fakeModel(doc));
    await service.process(mediaId);

    expect(doc.processingStatus).toBe("ready");
    expect(doc.fileUrl).toBe(`/uploads/organization-media/${orgId}/${orgId}-1763850000000-abcdef12.mp4`);
    expect(doc.mimeType).toBe("video/mp4");
    expect(doc.fileName).toBe("IMG_0412.mp4");
    expect(doc.durationSeconds).toBe(3);
    expect(doc.thumbnailUrl).toMatch(/\.jpg$/);
    expect(existsSync(input)).toBe(false);

    const output = join(root, "uploads", "organization-media", orgId, `${orgId}-1763850000000-abcdef12.mp4`);
    expect(statSync(output).size).toBeGreaterThan(1000);

    let info = "";
    try {
      execFileSync("ffmpeg", ["-hide_banner", "-i", output]);
    } catch (error: any) {
      info = String(error.stderr);
    }
    expect(info).toMatch(/Video: h264/);
    expect(info).toMatch(/Audio: aac/);
    expect(info).toMatch(/1080x1920/);
  }, 120_000);
});
