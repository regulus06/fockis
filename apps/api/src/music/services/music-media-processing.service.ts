import {



  Injectable,



  Logger,



} from "@nestjs/common";



import {



  existsSync,



  statSync,



} from "fs";



import {



  join,



  resolve,



  sep,



} from "path";



import {



  MusicContent,



  MediaProcessingState,



} from "../schemas/music-content.schema";



import { MusicService } from "./music.service";



import { FfmpegService } from "../../uploads/ffmpeg.service";



// ============================================================================



// TYPES



// ============================================================================



interface MusicProcessingContent {



  _id?: unknown;



  type?: string;



  mediaKind?: string;



  media?: {



    storageKey?: string;



  };



}



// ============================================================================



// SIZE CONSTANTS



// ============================================================================



const MB = 1024 * 1024;



const GB = 1024 * 1024 * 1024;



// ============================================================================



// PROFESSIONAL FOCKIS MEDIA LIMITS



// ============================================================================



interface MediaLimit {



  maxDurationSeconds: number;



  maxFileSizeBytes: number;



  label: string;



}



const MEDIA_LIMITS: Record<string, MediaLimit> = {



  song: {



    maxDurationSeconds: 3 * 60 * 60,



    maxFileSizeBytes: 500 * MB,



    label: "Songs / Singles",



  },



  single: {



    maxDurationSeconds: 3 * 60 * 60,



    maxFileSizeBytes: 500 * MB,



    label: "Songs / Singles",



  },



  track: {



    maxDurationSeconds: 3 * 60 * 60,



    maxFileSizeBytes: 500 * MB,



    label: "Songs / Singles",



  },



  beat: {



    maxDurationSeconds: 3 * 60 * 60,



    maxFileSizeBytes: 500 * MB,



    label: "Songs / Singles",



  },



  instrumental: {



    maxDurationSeconds: 3 * 60 * 60,



    maxFileSizeBytes: 500 * MB,



    label: "Songs / Singles",



  },



  album: {



    maxDurationSeconds: 12 * 60 * 60,



    maxFileSizeBytes: 2 * GB,



    label: "Albums / Long Audio",



  },



  ep: {



    maxDurationSeconds: 12 * 60 * 60,



    maxFileSizeBytes: 2 * GB,



    label: "Albums / Long Audio",



  },



  music: {



    maxDurationSeconds: 12 * 60 * 60,



    maxFileSizeBytes: 2 * GB,



    label: "Long Audio",



  },



  audio: {



    maxDurationSeconds: 12 * 60 * 60,



    maxFileSizeBytes: 2 * GB,



    label: "Long Audio",



  },



  music_video: {



    maxDurationSeconds: 3 * 60 * 60,



    maxFileSizeBytes: 4 * GB,



    label: "Music Videos",



  },



  video: {



    maxDurationSeconds: 8 * 60 * 60,



    maxFileSizeBytes: 20 * GB,



    label: "Long-form Video",



  },



  live_performance: {



    maxDurationSeconds: 12 * 60 * 60,



    maxFileSizeBytes: 30 * GB,



    label: "Recorded Live Streams",



  },



  interview: {



    maxDurationSeconds: 8 * 60 * 60,



    maxFileSizeBytes: 20 * GB,



    label: "Long-form Video",



  },



  behind_the_scenes: {



    maxDurationSeconds: 8 * 60 * 60,



    maxFileSizeBytes: 20 * GB,



    label: "Long-form Video",



  },



  tutorial: {



    maxDurationSeconds: 8 * 60 * 60,



    maxFileSizeBytes: 20 * GB,



    label: "Long-form Video",



  },



  exclusive: {



    maxDurationSeconds: 8 * 60 * 60,



    maxFileSizeBytes: 20 * GB,



    label: "Long-form Video",



  },



  exclusive_video: {



    maxDurationSeconds: 8 * 60 * 60,



    maxFileSizeBytes: 20 * GB,



    label: "Long-form Video",



  },



};



// ============================================================================



// SERVICE



// ============================================================================



@Injectable()



export class MusicMediaProcessingService {



  private readonly logger = new Logger(



    MusicMediaProcessingService.name,



  );



  constructor(



    private readonly musicService: MusicService,



    private readonly ffmpegService: FfmpegService,



  ) {}



  // ==========================================================================



  // PUBLIC PROCESS



  // ==========================================================================



  async process(



    content: MusicProcessingContent,



  ): Promise<void> {



    const contentId = String(



      content?._id ?? "",



    ).trim();



    if (!contentId) {



      throw new Error(



        "Cannot process music content without an ID.",



      );



    }



    this.logger.log(



      `[START] Music media processing: ${contentId}`,



    );



    try {



      await this.processContent(content);



      this.logger.log(



        `[COMPLETE] Music media processing: ${contentId}`,



      );



    } catch (error) {



      const message =



        error instanceof Error



          ? error.message



          : String(error);



      const stack =



        error instanceof Error



          ? error.stack



          : undefined;



      this.logger.error(



        `[FAILED] Music media processing for ${contentId}: ${message}`,



        stack,



      );



      try {



        await this.musicService.markMediaFailed(



          contentId,



        );



      } catch (markFailedError) {



        this.logger.error(



          `[FAILED STATUS ERROR] Could not mark ${contentId} as failed.`,



          markFailedError instanceof Error



            ? markFailedError.stack



            : String(markFailedError),



        );



      }



      throw error;



    }



  }



  // ==========================================================================



  // PROCESS CONTENT



  // ==========================================================================



  private async processContent(



    content: MusicProcessingContent,



  ): Promise<void> {



    const contentId = String(



      content?._id ?? "",



    ).trim();



    const storageKey = String(



      content?.media?.storageKey ?? "",



    ).trim();



    if (!contentId) {



      throw new Error(



        "Music content ID is missing.",



      );



    }



    if (!storageKey) {



      throw new Error(



        `Music content ${contentId} does not have a media storage key.`,



      );



    }



    const mediaKind = String(



      content?.mediaKind ?? "",



    )



      .trim()



      .toLowerCase();



    if (



      mediaKind !== "audio" &&



      mediaKind !== "video"



    ) {



      throw new Error(



        `Unsupported music media kind "${mediaKind}" for content ${contentId}.`,



      );



    }



    const contentType =



      this.normalizeContentType(



        content?.type,



      );



    const mediaLimit =



      this.getMediaLimit(



        contentType,



        mediaKind,



      );



    await this.musicService.markMediaProcessing(



      contentId,



    );



    const inputPath =



      this.resolveUploadPath(



        storageKey,



      );



    this.logger.log(



      `[INPUT] ${contentId}: ${inputPath}`,



    );



    if (!existsSync(inputPath)) {



      throw new Error(



        [



          "Uploaded media file does not exist.",



          `Content: ${contentId}`,



          `Storage key: ${storageKey}`,



          `Resolved path: ${inputPath}`,



        ].join(" "),



      );



    }



    this.validateFileSize(



      contentId,



      contentType,



      mediaKind,



      inputPath,



    );



    if (mediaKind === "audio") {



      await this.processAudio(



        contentId,



        contentType,



        inputPath,



      );



      return;



    }



    await this.processVideo(



      contentId,



      contentType,



      inputPath,



    );



    this.logger.log(



      `[MEDIA LIMIT USED] ${contentId}: ${mediaLimit.label}`,



    );



  }



  // ==========================================================================



  // AUDIO



  // ==========================================================================



  private async processAudio(



    contentId: string,



    contentType: string,



    inputPath: string,



  ): Promise<void> {



    this.logger.log(



      `[FFMPEG AUDIO START] ${contentId}`,



    );



    const processed =



      await this.ffmpegService.processAudio(



        inputPath,



      );



    if (!processed) {



      throw new Error(



        `FFmpeg audio processing returned no result for ${contentId}.`,



      );



    }



    const duration = Number(



      processed.durationSeconds,



    );



    if (



      !Number.isFinite(duration) ||



      duration <= 0



    ) {



      throw new Error(



        `Invalid audio duration for ${contentId}.`,



      );



    }



    this.validateDuration(



      contentId,



      contentType,



      "audio",



      duration,



    );



    const storageKey =



      this.toStorageKey(



        processed.storageKey ??



          processed.url,



      );



    if (!storageKey) {



      throw new Error(



        `Unable to determine processed audio storage key for ${contentId}.`,



      );



    }



    if (!this.isGatewayMediaKey(storageKey)) {

      const processedAudioPath =

        this.resolveUploadPath(storageKey);



      this.assertProcessedFileExists(

        contentId,

        "audio",

        storageKey,

        processedAudioPath,

      );

    }



    const storedMediaReference =

      this.isGatewayMediaKey(storageKey)

        ? processed.url

        : storageKey;



    await this.musicService.updateProcessedMediaStorageKey(

      contentId,

      storedMediaReference,

    );



    await this.musicService.markMediaReady(



      contentId,



      duration,



    );



    this.logger.log(



      `[READY] ${contentId}: audio media is ready.`,



    );



  }



  // ==========================================================================



  // VIDEO



  // ==========================================================================



  private async processVideo(



    contentId: string,



    contentType: string,



    inputPath: string,



  ): Promise<void> {



    this.logger.log(



      `[FFMPEG VIDEO START] ${contentId}`,



    );



    // ------------------------------------------------------------------------



    // PROCESS VIDEO



    // ------------------------------------------------------------------------



    const processed =



      await this.ffmpegService.processVideo(



        inputPath,



      );



    if (!processed) {



      throw new Error(



        `FFmpeg video processing returned no result for ${contentId}.`,



      );



    }



    const duration = Number(



      processed.durationSeconds,



    );



    if (



      !Number.isFinite(duration) ||



      duration <= 0



    ) {



      throw new Error(



        `Invalid video duration for ${contentId}.`,



      );



    }



    this.validateDuration(



      contentId,



      contentType,



      "video",



      duration,



    );



    if (!processed.outputPath) {



      throw new Error(



        `FFmpeg did not return a processed video path for ${contentId}.`,



      );



    }



    // ------------------------------------------------------------------------



    // SAVE PROCESSED VIDEO



    // ------------------------------------------------------------------------



    const processedStorageKey =



      this.toStorageKey(



        processed.url,



      );



    if (!processedStorageKey) {



      throw new Error(



        `Unable to determine processed video storage key for ${contentId}.`,



      );



    }



    if (!this.isGatewayMediaKey(processedStorageKey)) {

      const processedVideoResolvedPath =

        this.resolveUploadPath(processedStorageKey);



      this.assertProcessedFileExists(

        contentId,

        "video",

        processedStorageKey,

        processedVideoResolvedPath,

      );

    }



    const storedVideoReference =

      this.isGatewayMediaKey(processedStorageKey)

        ? processed.url

        : processedStorageKey;



    await this.musicService.updateProcessedMediaStorageKey(

      contentId,

      storedVideoReference,

    );



    this.logger.log(



      `[VIDEO READY FILE] ${contentId}: ${processed.outputPath}`,



    );



    // ------------------------------------------------------------------------



    // AUTOMATIC COVER



    // ------------------------------------------------------------------------



    await this.generateAutomaticCover(



      contentId,



      processed.outputPath,



    );



    // ------------------------------------------------------------------------



    // MARK READY



    // ------------------------------------------------------------------------



    await this.musicService.markMediaReady(



      contentId,



      duration,



    );



    this.logger.log(



      `[READY] ${contentId}: video media is ready.`,



    );



  }



  // ==========================================================================



  // AUTOMATIC VIDEO COVER



  // ==========================================================================



  private async generateAutomaticCover(



    contentId: string,



    processedVideoPath: string,



  ): Promise<void> {



    if (!processedVideoPath?.trim()) {



      throw new Error(



        `[COVER] ${contentId}: processed video path is empty.`,



      );



    }



    if (!existsSync(processedVideoPath)) {



      throw new Error(



        `[COVER] ${contentId}: processed video does not exist: ${processedVideoPath}`,



      );



    }



    // ------------------------------------------------------------------------



    // CHECK DATABASE FOR CUSTOM COVER



    // ------------------------------------------------------------------------



    const content =



      await this.musicContentModelFindCover(



        contentId,



      );



    if (!content) {



      throw new Error(



        `[COVER] ${contentId}: content not found.`,



      );



    }



    const existingCover =



      content.coverImage?.storageKey?.trim();



    if (existingCover) {



      this.logger.log(



        `[COVER] ${contentId}: custom cover exists. Keeping creator cover.`,



      );



      return;



    }



    // ------------------------------------------------------------------------



    // GENERATE FRAME



    // ------------------------------------------------------------------------



    this.logger.log(



      `[COVER] ${contentId}: generating automatic cover from processed video.`,



    );



    const generated =



      await this.ffmpegService.generateVideoCover(



        processedVideoPath,



      );



    if (!generated) {



      throw new Error(



        `[COVER] ${contentId}: FFmpeg returned no cover.`,



      );



    }



    const generatedStorageKey =



      this.toStorageKey(



        generated.storageKey ??



          generated.url,



      );



    if (!generatedStorageKey) {



      throw new Error(



        `[COVER] ${contentId}: generated cover has no valid storage key.`,



      );



    }



    // ------------------------------------------------------------------------



    // SAVE GENERATED COVER



    // ------------------------------------------------------------------------



    const storedCoverReference =

      this.isGatewayMediaKey(generatedStorageKey)

        ? generated.url

        : generatedStorageKey;



    await this.musicService.updateGeneratedCover(

      contentId,

      storedCoverReference,

    );



    this.logger.log(



      `[COVER READY] ${contentId}: ${generatedStorageKey}`,



    );



  }



  // ==========================================================================



  // ==========================================================================



  // PROCESSED FILE VALIDATION



  // ==========================================================================



  private isGatewayMediaKey(storageKey: string): boolean {
    const normalized = String(storageKey ?? "")
      .trim()
      .replace(/^\/+/, "")
      .toLowerCase();

    return (
      normalized.startsWith("post-media/") ||
      normalized.startsWith("http://") ||
      normalized.startsWith("https://") ||
      normalized.startsWith("gs://")
    );
  }

  private assertProcessedFileExists(



    contentId: string,



    mediaKind: "audio" | "video",



    storageKey: string,



    resolvedPath: string,



  ): void {



    if (!existsSync(resolvedPath)) {



      throw new Error(



        [



          `Processed ${mediaKind} media file does not exist.`,



          `Content: ${contentId}`,



          `Storage key: ${storageKey}`,



          `Resolved path: ${resolvedPath}`,



        ].join(" "),



      );



    }



    const fileSize = Number(statSync(resolvedPath).size);



    if (!Number.isFinite(fileSize) || fileSize <= 0) {



      throw new Error(



        [



          `Processed ${mediaKind} media file is empty.`,



          `Content: ${contentId}`,



          `Storage key: ${storageKey}`,



          `Resolved path: ${resolvedPath}`,



        ].join(" "),



      );



    }



    this.logger.log(



      `[PROCESSED FILE VERIFIED] ${contentId}: ${mediaKind} ${this.formatBytes(fileSize)}`,



    );



  }



  // LOAD COVER



  // ==========================================================================



  private async musicContentModelFindCover(



    contentId: string,



  ): Promise<



    Pick<MusicContent, "coverImage"> | null



  > {



    /*



     * We intentionally retrieve the content through MusicService.



     *



     * MusicService.findById() is the authoritative content lookup.



     */



    const content =



      await this.musicService.findById(



        contentId,



      );



    if (!content) {



      return null;



    }



    return {



      coverImage: content.coverImage,



    };



  }



  // ==========================================================================



  // FILE SIZE



  // ==========================================================================



  private validateFileSize(



    contentId: string,



    contentType: string,



    mediaKind: string,



    inputPath: string,



  ): void {



    const stats = statSync(inputPath);



    const fileSize = Number(stats.size);



    const limit =



      this.getMediaLimit(



        contentType,



        mediaKind,



      );



    this.logger.log(



      `[FILE SIZE] ${contentId}: ${this.formatBytes(



        fileSize,



      )} / ${this.formatBytes(



        limit.maxFileSizeBytes,



      )}`,



    );



    if (



      fileSize >



      limit.maxFileSizeBytes



    ) {



      throw new Error(



        [



          "Media file exceeds the Fockis upload limit.",



          `Content: ${contentId}.`,



          `Category: ${limit.label}.`,



          `Maximum: ${this.formatBytes(



            limit.maxFileSizeBytes,



          )}.`,



          `Actual: ${this.formatBytes(



            fileSize,



          )}.`,



        ].join(" "),



      );



    }



  }



  // ==========================================================================



  // DURATION



  // ==========================================================================



  private validateDuration(



    contentId: string,



    contentType: string,



    mediaKind: string,



    durationSeconds: number,



  ): void {



    const limit =



      this.getMediaLimit(



        contentType,



        mediaKind,



      );



    if (



      durationSeconds >



      limit.maxDurationSeconds



    ) {



      throw new Error(



        [



          "Media duration exceeds the Fockis duration limit.",



          `Content: ${contentId}.`,



          `Category: ${limit.label}.`,



          `Maximum: ${this.formatDuration(



            limit.maxDurationSeconds,



          )}.`,



          `Actual: ${this.formatDuration(



            durationSeconds,



          )}.`,



        ].join(" "),



      );



    }



  }



  // ==========================================================================



  // MEDIA LIMIT



  // ==========================================================================



  private getMediaLimit(



    contentType: string,



    mediaKind: string,



  ): MediaLimit {



    const normalized =



      this.normalizeContentType(



        contentType,



      );



    const configured =



      MEDIA_LIMITS[normalized];



    if (configured) {



      return configured;



    }



    if (mediaKind === "video") {



      return {



        maxDurationSeconds: 8 * 60 * 60,



        maxFileSizeBytes: 20 * GB,



        label: "Long-form Video",



      };



    }



    return {



      maxDurationSeconds: 12 * 60 * 60,



      maxFileSizeBytes: 2 * GB,



      label: "Long Audio",



    };



  }



  // ==========================================================================



  // NORMALIZE TYPE



  // ==========================================================================



  private normalizeContentType(



    type?: string,



  ): string {



    const normalized =



      String(type ?? "")



        .trim()



        .toLowerCase()



        .replace(/-/g, "_")



        .replace(/\s+/g, "_");



    switch (normalized) {



      case "musicvideo":



        return "music_video";



      case "liveperformance":



        return "live_performance";



      case "behindthescenes":



        return "behind_the_scenes";



      case "exclusivevideo":



        return "exclusive_video";



      case "movie":



      case "film":



        return "video";



      default:



        return normalized;



    }



  }



  // ==========================================================================



  // FORMAT BYTES



  // ==========================================================================



  private formatBytes(



    bytes: number,



  ): string {



    if (bytes >= GB) {



      return `${(



        bytes / GB



      ).toFixed(2)} GB`;



    }



    if (bytes >= MB) {



      return `${(



        bytes / MB



      ).toFixed(0)} MB`;



    }



    if (bytes >= 1024) {



      return `${(



        bytes / 1024



      ).toFixed(0)} KB`;



    }



    return `${bytes} bytes`;



  }



  // ==========================================================================



  // FORMAT DURATION



  // ==========================================================================



  private formatDuration(



    seconds: number,



  ): string {



    const total = Math.max(



      0,



      Math.floor(seconds),



    );



    const hours = Math.floor(



      total / 3600,



    );



    const minutes = Math.floor(



      (total % 3600) / 60,



    );



    const remaining =



      total % 60;



    if (hours > 0) {



      return `${hours}h ${minutes}m`;



    }



    if (minutes > 0) {



      return `${minutes}m ${remaining}s`;



    }



    return `${remaining}s`;



  }



  // ==========================================================================



  // RESOLVE UPLOAD PATH



  // ==========================================================================



  private resolveUploadPath(storageKey: string): string {
    let normalized = String(storageKey ?? "").trim();

    if (!normalized) {
      throw new Error("Media storage key is empty.");
    }

    normalized = normalized.replace(/\\/g, "/");
    normalized = normalized.replace(/^https?:\/\/[^/]+/i, "");
    normalized = normalized.split("?")[0];
    normalized = normalized.split("#")[0];
    normalized = normalized.replace(/^\/+/, "");
    normalized = normalized.replace(/^uploads?\//i, "");
    normalized = normalized.replace(/^\/+/, "");

    if (!normalized) {
      throw new Error(`Invalid media storage key: ${storageKey}`);
    }

    if (normalized.split("/").some((part) => part === "..")) {
      throw new Error(
        `Invalid media storage key containing directory traversal: ${storageKey}`,
      );
    }

    const uploadsRoot = resolve(process.cwd(), "uploads");
    const finalPath = resolve(join(uploadsRoot, normalized));

    const uploadsPrefix = uploadsRoot.endsWith(sep)
      ? uploadsRoot
      : `${uploadsRoot}${sep}`;

    if (
      finalPath !== uploadsRoot &&
      !finalPath.startsWith(uploadsPrefix)
    ) {
      throw new Error(
        `Invalid media storage path outside uploads directory: ${storageKey}`,
      );
    }

    return finalPath;
  }

  // ============================================================================

  // URL -> STORAGE KEY

  // ============================================================================

  private toStorageKey(value?: string): string {
    let normalized = String(value ?? "").trim();

    if (!normalized) {
      return "";
    }

    normalized = normalized.replace(/\\/g, "/");
    normalized = normalized.replace(/^https?:\/\/[^/]+/i, "");
    normalized = normalized.split("?")[0];
    normalized = normalized.split("#")[0];
    normalized = normalized.replace(/^\/+/, "");
    normalized = normalized.replace(/^uploads?\//i, "");
    normalized = normalized.replace(/^\/+/, "");

    if (
      !normalized ||
      normalized.split("/").some((part) => part === "..")
    ) {
      return "";
    }

    return normalized.trim();
  }
}