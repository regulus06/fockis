import {

  Injectable,

  InternalServerErrorException,

} from "@nestjs/common";



import ffmpeg = require("fluent-ffmpeg");

import ffmpegPath = require("ffmpeg-static");



import { randomUUID } from "crypto";



import {

  join,

  resolve,

} from "path";



import {

  mkdir,

  stat,

} from "fs/promises";



// ============================================================================

// FFMPEG CONFIGURATION

// ============================================================================



if (ffmpegPath) {

  ffmpeg.setFfmpegPath(

    ffmpegPath as unknown as string,

  );

}



// ============================================================================

// TYPES

// ============================================================================



export interface ProcessedVideoResult {

  outputPath: string;

  url: string;

  durationSeconds: number;

}



export interface ProcessedAudioResult {

  outputPath: string;

  url: string;

  storageKey: string;

  durationSeconds: number;

}



export interface GeneratedVideoCoverResult {

  outputPath: string;

  url: string;

  storageKey: string;

}



// ============================================================================

// SERVICE

// ============================================================================



@Injectable()

export class FfmpegService {

  // ==========================================================================

  // VIDEO PROCESSING

  // ==========================================================================



  /**

   * Processes the complete video.

   *

   * IMPORTANT:

   *

   * This method does NOT truncate the uploaded video.

   *

   * Content-specific duration limits are enforced by

   * MusicService / MusicMediaProcessingService.

   */

  async processVideo(

    inputPath: string,

    _maxDurationSeconds?: number,

  ): Promise<ProcessedVideoResult> {

    if (!inputPath?.trim()) {

      throw new InternalServerErrorException(

        "Video input path is required.",

      );

    }



    const outputDirectory =

      resolve(process.cwd(), "uploads/videos");



    await mkdir(

      outputDirectory,

      {

        recursive: true,

      },

    );



    const outputName =

      `${randomUUID()}.mp4`;



    const outputPath =

      join(

        outputDirectory,

        outputName,

      );



    return new Promise(

      (resolve, reject) => {

        let lastTimemark =

          "00:00:00.00";



        const command =

          ffmpeg(inputPath)

            .outputOptions([

              "-c:v libx264",

              "-preset fast",

              "-crf 28",

              "-c:a aac",

              "-movflags +faststart",

            ]);



        command

          .output(outputPath)



          .on(

            "progress",

            (progress) => {

              if (

                progress?.timemark

              ) {

                lastTimemark =

                  progress.timemark;

              }

            },

          )



          .on(

            "end",

            async () => {

              let durationSeconds =

                0;



              try {

                durationSeconds =

                  await this.getMediaDuration(

                    outputPath,

                  );

              } catch {

                durationSeconds =

                  this.parseTimemark(

                    lastTimemark,

                  );

              }



              if (

                !Number.isFinite(

                  durationSeconds,

                ) ||

                durationSeconds <= 0

              ) {

                reject(

                  new InternalServerErrorException(

                    "Unable to determine processed video duration.",

                  ),

                );



                return;

              }



              resolve({

                outputPath,



                url:

                  `/uploads/videos/${outputName}`,



                durationSeconds,

              });

            },

          )



          .on(

            "error",

            (error) => {

              reject(

                error,

              );

            },

          )



          .run();

      },

    );

  }



  // ==========================================================================

  // AUTOMATIC VIDEO COVER

  // ==========================================================================



  /**

   * Generates a public JPG cover from a video.

   *

   * The generated image is intentionally stored at:

   *

   *   uploads/music-covers/

   *

   * rather than:

   *

   *   uploads/music/

   *

   * because /uploads/music/* is protected by main.ts.

   *

   * The video itself remains protected.

   */

  async generateVideoCover(

    inputPath: string,

  ): Promise<GeneratedVideoCoverResult> {

    if (!inputPath?.trim()) {

      throw new InternalServerErrorException(

        "Video input path is required for cover generation.",

      );

    }



    const outputDirectory =

      resolve(process.cwd(), "uploads/music-covers");



    await mkdir(

      outputDirectory,

      {

        recursive: true,

      },

    );



    const outputName =

      `${randomUUID()}.jpg`;



    const outputPath =

      join(

        outputDirectory,

        outputName,

      );



    // ------------------------------------------------------------------------

    // DETERMINE VIDEO DURATION

    // ------------------------------------------------------------------------



    let durationSeconds = 0;



    try {

      durationSeconds =

        await this.getMediaDuration(

          inputPath,

        );

    } catch {

      durationSeconds = 0;

    }



    // ------------------------------------------------------------------------

    // CHOOSE REPRESENTATIVE FRAME

    // ------------------------------------------------------------------------

    //

    // We intentionally avoid frame 0 because many professional videos have:

    //

    // - black opening frames

    // - fade-ins

    // - production logos

    // - blank intro frames

    //

    // Strategy:

    //

    //   Very short video -> middle-ish safe frame

    //   Normal video      -> approximately 5% in

    //   Long video        -> never seek beyond 10 seconds

    //

    // ------------------------------------------------------------------------



    let seekSeconds = 1;



    if (

      Number.isFinite(

        durationSeconds,

      ) &&

      durationSeconds > 0

    ) {

      if (

        durationSeconds <= 2

      ) {

        seekSeconds =

          Math.max(

            durationSeconds * 0.5,

            0,

          );

      } else {

        const fivePercent =

          durationSeconds * 0.05;



        seekSeconds =

          Math.min(

            Math.max(

              fivePercent,

              1,

            ),

            10,

          );



        /*

         * Never seek beyond the end of the video.

         */

        if (

          seekSeconds >=

          durationSeconds

        ) {

          seekSeconds =

            Math.max(

              durationSeconds - 0.1,

              0,

            );

        }

      }

    }



    // =========================================================================

    // EXTRACT FRAME

    // =========================================================================



    return new Promise(

      (resolve, reject) => {

        ffmpeg(inputPath)

          /*

           * Seek before decoding the frame.

           *

           * This is substantially more efficient than decoding

           * an entire multi-hour video just to obtain one image.

           */

          .seekInput(

            seekSeconds,

          )



          .frames(1)



          .outputOptions([

            /*

             * High-quality JPEG.

             */

            "-q:v 2",



            /*

             * Keep the cover reasonably sized while preserving

             * the original aspect ratio.

             */

            "-vf scale='min(1920,iw)':-2",



            /*

             * Explicit JPEG output.

             */

            "-f image2",

          ])



          .output(

            outputPath,

          )



          .on(

            "end",

            async () => {

              try {

                // --------------------------------------------------------------

                // VERIFY GENERATED FILE

                // --------------------------------------------------------------



                const fileStats =

                  await stat(

                    outputPath,

                  );



                if (

                  !fileStats.isFile() ||

                  fileStats.size <= 0

                ) {

                  reject(

                    new InternalServerErrorException(

                      "FFmpeg completed but generated an empty video cover.",

                    ),

                  );



                  return;

                }



                // --------------------------------------------------------------

                // SUCCESS

                // --------------------------------------------------------------



                resolve({

                  outputPath,



                  url:

                    `/uploads/music-covers/${outputName}`,



                  storageKey:

                    `music-covers/${outputName}`,

                });

              } catch {

                reject(

                  new InternalServerErrorException(

                    "FFmpeg completed but the generated video cover could not be verified.",

                  ),

                );

              }

            },

          )



          .on(

            "error",

            (error) => {

              reject(

                new InternalServerErrorException(

                  `Unable to generate video cover: ${

                    error?.message ??

                    "Unknown FFmpeg error"

                  }`,

                ),

              );

            },

          )



          .run();

      },

    );

  }



  // ==========================================================================

  // AUDIO PROCESSING

  // ==========================================================================



  async processAudio(

    inputPath: string,

  ): Promise<ProcessedAudioResult> {

    if (!inputPath?.trim()) {

      throw new InternalServerErrorException(

        "Audio input path is required.",

      );

    }



    const outputDirectory =

      resolve(process.cwd(), "uploads/music/processed");



    await mkdir(

      outputDirectory,

      {

        recursive: true,

      },

    );



    const outputName =

      `${randomUUID()}.mp3`;



    const outputPath =

      join(

        outputDirectory,

        outputName,

      );



    return new Promise(

      (resolve, reject) => {

        let lastTimemark =

          "00:00:00.00";



        ffmpeg(inputPath)

          .outputOptions([

            "-vn",

            "-c:a libmp3lame",

            "-b:a 192k",

            "-ar 44100",

            "-ac 2",

          ])



          .output(

            outputPath,

          )



          .on(

            "progress",

            (progress) => {

              if (

                progress?.timemark

              ) {

                lastTimemark =

                  progress.timemark;

              }

            },

          )



          .on(

            "end",

            async () => {

              let durationSeconds =

                0;



              try {

                durationSeconds =

                  await this.getMediaDuration(

                    outputPath,

                  );

              } catch {

                durationSeconds =

                  this.parseTimemark(

                    lastTimemark,

                  );

              }



              if (

                !Number.isFinite(

                  durationSeconds,

                ) ||

                durationSeconds <= 0

              ) {

                reject(

                  new InternalServerErrorException(

                    "Unable to determine audio duration.",

                  ),

                );



                return;

              }



              resolve({

                outputPath,



                url:

                  `/uploads/music/processed/${outputName}`,



                storageKey:

                  `music/processed/${outputName}`,



                durationSeconds,

              });

            },

          )



          .on(

            "error",

            (error) => {

              reject(

                error,

              );

            },

          )



          .run();

      },

    );

  }



  // ==========================================================================

  // MEDIA DURATION

  // ==========================================================================



  async getMediaDuration(

    inputPath: string,

  ): Promise<number> {

    if (!inputPath?.trim()) {

      throw new InternalServerErrorException(

        "Media input path is required.",

      );

    }



    return new Promise(

      (resolve, reject) => {

        ffmpeg.ffprobe(

          inputPath,

          (

            error,

            metadata,

          ) => {

            if (error) {

              reject(

                error,

              );



              return;

            }



            const duration =

              Number(

                metadata?.format

                  ?.duration,

              );



            if (

              !Number.isFinite(

                duration,

              ) ||

              duration <= 0

            ) {

              reject(

                new Error(

                  "Media duration is unavailable.",

                ),

              );



              return;

            }



            resolve(

              duration,

            );

          },

        );

      },

    );

  }



  // ==========================================================================

  // TIMEMARK FALLBACK

  // ==========================================================================



  private parseTimemark(

    timemark?: string,

  ): number {

    if (

      !timemark ||

      typeof timemark !==

        "string"

    ) {

      return 0;

    }



    const parts =

      timemark

        .split(":")

        .map(

          (value) =>

            Number(value),

        );



    if (

      parts.length !== 3 ||

      parts.some(

        (part) =>

          !Number.isFinite(

            part,

          ),

      )

    ) {

      return 0;

    }



    const [

      hours,

      minutes,

      seconds,

    ] = parts;



    return (

      hours * 3600 +

      minutes * 60 +

      seconds

    );

  }

}