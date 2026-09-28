import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  constructor() {
    ffmpeg.setFfmpegPath(ffmpegPath!);
    ffmpeg.setFfprobePath(ffprobe.path);
  }

  private ensureDir(dir: string) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // =========================
  // COMPRESS VIDEO
  // =========================
  async compressVideo(inputPath: string): Promise<string> {
    const outputDir = join(process.cwd(), 'uploads', 'processed');
    this.ensureDir(outputDir);

    const outputPath = join(outputDir, `${randomUUID()}.mp4`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-vcodec libx264',
          '-crf 28',
          '-preset fast',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
        ])
        .save(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  // =========================
  // THUMBNAIL
  // =========================
  async generateThumbnail(inputPath: string): Promise<string> {
    const outputDir = join(process.cwd(), 'uploads', 'thumbnails');
    this.ensureDir(outputDir);

    const fileName = `${randomUUID()}.jpg`;
    const outputPath = join(outputDir, fileName);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: fileName,
          folder: outputDir,
          size: '720x1280',
        })
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  // =========================
  // MERGE VIDEO + MUSIC
  // =========================
  async mergeVideoWithMusic(videoPath: string, musicPath: string): Promise<string> {
    const outputDir = join(process.cwd(), 'uploads', 'processed');
    this.ensureDir(outputDir);

    const outputPath = join(outputDir, `${randomUUID()}.mp4`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .addInput(musicPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-shortest',
          '-preset fast',
        ])
        .save(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  }

  // =========================
  // INFO
  // =========================
  async getVideoInfo(inputPath: string) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }
}