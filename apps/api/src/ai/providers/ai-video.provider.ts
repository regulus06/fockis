import {

  Injectable,

  Logger,

  OnModuleInit,

} from "@nestjs/common";

import {

  GoogleGenAI,

  type GenerateVideosOperation,

} from "@google/genai";

import type {

  AiProviderVideoRequest,

  AiProviderVideoResult,

} from "../types/ai.types";

@Injectable()

export class GoogleVeoVideoProvider implements OnModuleInit {

  readonly name = "google-veo-3.1";

  private readonly logger = new Logger(

    GoogleVeoVideoProvider.name,

  );

  private client!: GoogleGenAI;

  private readonly project =

    process.env.GOOGLE_CLOUD_PROJECT;

  private readonly location =

    process.env.GOOGLE_CLOUD_LOCATION ||

    "us-central1";

  private readonly bucket =
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

  /**
   * Render-safe Google service-account credentials.
   *
   * Set GOOGLE_SERVICE_ACCOUNT_JSON in Render to the complete
   * service-account JSON downloaded from Google Cloud.
   *
   * GOOGLE_APPLICATION_CREDENTIALS is still supported for local
   * development when it points to a credentials file.
   */
  private readonly serviceAccountJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  /**

   * Keep the actual SDK operation objects in memory.

   *

   * This is important because @google/genai expects the

   * GenerateVideosOperation instance returned by

   * models.generateVideos() to be passed back into

   * operations.getVideosOperation().

   */

  private readonly operations =

    new Map<string, GenerateVideosOperation>();

  // ==========================================================================

  // INITIALIZATION

  // ==========================================================================

  onModuleInit(): void {

    if (!this.project) {

      throw new Error(

        "GOOGLE_CLOUD_PROJECT is not configured.",

      );

    }

    if (!this.bucket) {

      throw new Error(

        "GOOGLE_CLOUD_STORAGE_BUCKET is not configured.",

      );

    }

    let googleAuthOptions: Record<string, unknown> | undefined;

    if (this.serviceAccountJson?.trim()) {
      try {
        const credentials = JSON.parse(
          this.serviceAccountJson,
        ) as {
          type?: string;
          project_id?: string;
          client_email?: string;
          private_key?: string;
        };

        if (
          !credentials.client_email ||
          !credentials.private_key
        ) {
          throw new Error(
            "Service-account JSON must contain client_email and private_key.",
          );
        }

        googleAuthOptions = {
          credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key.replace(
              /\\n/g,
              "\n",
            ),
            project_id:
              credentials.project_id || this.project,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        throw new Error(
          `GOOGLE_SERVICE_ACCOUNT_JSON is invalid: ${message}`,
        );
      }
    } else if (
      !process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      throw new Error(
        "Google credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in Render or GOOGLE_APPLICATION_CREDENTIALS for a credentials file.",
      );
    }

    this.client = new GoogleGenAI({
      vertexai: true,
      project: this.project,
      location: this.location,
      ...(googleAuthOptions
        ? { googleAuthOptions }
        : {}),
    } as any);

    this.logger.log(

      `Google Veo provider initialized: project=${this.project}, location=${this.location}, bucket=${this.bucket}`,

    );

  }

  // ==========================================================================

  // START VIDEO GENERATION

  // ==========================================================================

  async generateVideo(

    request: AiProviderVideoRequest,

  ): Promise<AiProviderVideoResult> {

    if (!this.client) {

      throw new Error(

        "Google Veo provider has not been initialized.",

      );

    }

    const model = this.validateModel(

      request.model,

    );

    const duration = this.validateDuration(

      request.durationSeconds,

    );

    const aspectRatio =

      request.aspectRatio === "9:16"

        ? "9:16"

        : "16:9";

    const outputGcsUri =

      this.validateOutputUri(

        request.outputGcsUri,

      );

    const imageInput = this.buildImageInput(request);

    if (

      !request.prompt ||

      request.prompt.trim().length < 3

    ) {

      throw new Error(

        "A valid Veo prompt is required.",

      );

    }

    this.logger.log(

      `Starting Veo generation: model=${model}, duration=${duration}, aspectRatio=${aspectRatio}`,

    );

    /**

     * IMPORTANT:

     *

     * Keep the actual GenerateVideosOperation returned

     * by the SDK. Do not serialize it to JSON and do not

     * reconstruct it with a plain object.

     */

    const operation =

      await this.client.models.generateVideos({

        model,

        source: {

          prompt: request.prompt.trim(),

          ...(imageInput

            ? {

                image: imageInput,

              }

            : {}),

        },

        config: {

          aspectRatio,

          durationSeconds: duration,

          numberOfVideos: 1,

          outputGcsUri,

        },

      } as any);

    const operationName =

      this.extractOperationName(

        operation,

      );

    if (!operationName) {

      throw new Error(

        "Google Veo did not return an operation name.",

      );

    }

    /**

     * Store the REAL SDK operation object.

     *

     * The polling method will retrieve this exact object

     * and pass it to getVideosOperation().

     */

    this.operations.set(

      operationName,

      operation,

    );

    this.logger.log(

      `Veo operation started: ${operationName}`,

    );

    return {

      operationName,

      provider: this.name,

      model,

      outputGcsUri: undefined,

    };

  }

  // ==========================================================================

  // WAIT FOR VIDEO

  // ==========================================================================

  async waitForVideo(

    operationName: string,

    signal?: AbortSignal,

  ): Promise<AiProviderVideoResult> {

    if (!this.client) {

      throw new Error(

        "Google Veo provider has not been initialized.",

      );

    }

    if (

      !operationName ||

      operationName.trim().length === 0

    ) {

      throw new Error(

        "Google Veo operation name is required.",

      );

    }

    const timeoutMs =

      this.getPositiveNumber(

        process.env.AI_VEO_OPERATION_TIMEOUT_MS,

        45 * 60 * 1000,

      );

    const pollMs = Math.max(

      5_000,

      this.getPositiveNumber(

        process.env.AI_VEO_POLL_INTERVAL_MS,

        15_000,

      ),

    );

    const startedAt = Date.now();

    /**

     * IMPORTANT:

     *

     * Retrieve the REAL GenerateVideosOperation object

     * that was returned by generateVideos().

     */

    let operation =

      this.operations.get(operationName);

    if (!operation) {

      throw new Error(

        `Google Veo operation ${operationName} is no longer available in this worker.`,

      );

    }

    this.logger.log(

      `Polling Veo operation: ${operationName}`,

    );

    while (true) {

      if (signal?.aborted) {

        this.operations.delete(

          operationName,

        );

        throw new Error(

          "Veo generation was cancelled.",

        );

      }

      if (

        Date.now() - startedAt >

        timeoutMs

      ) {

        this.operations.delete(

          operationName,

        );

        throw new Error(

          `Veo generation timed out: ${operationName}`,

        );

      }

      /**

       * @google/genai 2.23.0 provides the dedicated

       * getVideosOperation() method for Veo operations.

       *

       * Do NOT use:

       *

       * client.operations.get({ operation })

       *

       * Use:

       *

       * client.operations.getVideosOperation({ operation })

       */

      operation =

        await this.client.operations.getVideosOperation(

          {

            operation,

          },

        );

      this.logger.debug(

        `Veo operation status: done=${Boolean(

          operation.done,

        )}`,

      );

      if (operation.error) {

        const error =

          operation.error;

        this.operations.delete(

          operationName,

        );

        throw new Error(

          `Google Veo generation failed: ${

            error?.message ||

            JSON.stringify(error)

          }`,

        );

      }

      if (operation.done) {

        const uri =

          this.extractVideoUri(

            operation,

          );

        this.operations.delete(

          operationName,

        );

        if (!uri) {

          this.logger.error(

            `Veo operation completed without a video URI: ${JSON.stringify(

              operation,

            )}`,

          );

          throw new Error(

            "Google Veo completed without returning a video URI.",

          );

        }

        const model =

          this.extractOperationModel(

            operation,

          ) || "unknown";

        this.logger.log(

          `Veo generation completed: operation=${operationName}, uri=${uri}`,

        );

        return {

          operationName:

            this.extractOperationName(

              operation,

            ) || operationName,

          provider: this.name,

          model,

          outputGcsUri: uri,

        };

      }

      await this.sleep(

        pollMs,

        signal,

      );

    }

  }

  // ==========================================================================

  // CANCEL

  // ==========================================================================

  async cancelVideo(

    _operationName: string,

  ): Promise<void> {

    /**

     * Fockis cancellation stops additional scene

     * generation and marks the MongoDB job as cancelled.

     *

     * The submitted Veo operation is not forcibly

     * terminated here because we are not relying on

     * an unstable cancellation contract.

     */

    return;

  }

  // ==========================================================================

  // MODEL VALIDATION

  // ==========================================================================

  private validateModel(

    model: string,

  ): string {

    const allowedModels =

      new Set([

        "veo-3.1-fast-generate-001",

        "veo-3.1-generate-001",

        "veo-3.1-lite-generate-001",

      ]);

    if (

      !allowedModels.has(model)

    ) {

      throw new Error(

        `Unsupported Veo model: ${model}`,

      );

    }

    return model;

  }

  // ==========================================================================

  // DURATION VALIDATION

  // ==========================================================================

  private validateDuration(

    duration: number,

  ): 4 | 6 | 8 {

    if (

      duration !== 4 &&

      duration !== 6 &&

      duration !== 8

    ) {

      throw new Error(

        "Veo scene duration must be 4, 6, or 8 seconds.",

      );

    }

    return duration;

  }

  // ==========================================================================

  // IMAGE INPUT

  // ==========================================================================

  /**

   * Builds the optional image-to-video source input.

   *

   * The image is supplied as a GCS URI so Vertex AI can read it directly.

   * The worker should normally pass this only for the first scene.

   */

  private buildImageInput(

    request: AiProviderVideoRequest,

  ):

    | {

        gcsUri: string;

        mimeType: string;

      }

    | undefined {

    const imageGcsUri =

      request.imageGcsUri?.trim();

    if (!imageGcsUri) {

      return undefined;

    }

    const expectedPrefix =

      `gs://${this.bucket}/`;

    if (

      !imageGcsUri.startsWith(

        expectedPrefix,

      )

    ) {

      throw new Error(

        `Veo image must be stored in ${expectedPrefix}`,

      );

    }

    const mimeType =

      request.imageMimeType?.trim() ||

      "image/jpeg";

    const allowedMimeTypes =

      new Set([

        "image/jpeg",

        "image/png",

        "image/webp",

      ]);

    if (

      !allowedMimeTypes.has(

        mimeType.toLowerCase(),

      )

    ) {

      throw new Error(

        `Unsupported Veo image MIME type: ${mimeType}. Supported types: image/jpeg, image/png, image/webp.`,

      );

    }

    return {

      gcsUri: imageGcsUri,

      mimeType: mimeType.toLowerCase(),

    };

  }

  // ==========================================================================

  // GCS URI VALIDATION

  // ==========================================================================

  private validateOutputUri(

    uri: string,

  ): string {

    const expectedPrefix =

      `gs://${this.bucket}/`;

    if (

      !uri.startsWith(

        expectedPrefix,

      )

    ) {

      throw new Error(

        `Veo output must be stored in ${expectedPrefix}`,

      );

    }

    return uri;

  }

  // ==========================================================================

  // OPERATION NAME EXTRACTION

  // ==========================================================================

  private extractOperationName(

    operation: any,

  ): string | undefined {

    if (!operation) {

      return undefined;

    }

    if (

      typeof operation.name ===

      "string"

    ) {

      return operation.name;

    }

    if (

      typeof operation.operationName ===

      "string"

    ) {

      return operation.operationName;

    }

    if (

      typeof operation.metadata

        ?.name === "string"

    ) {

      return operation.metadata.name;

    }

    return undefined;

  }

  // ==========================================================================

  // VIDEO URI EXTRACTION

  // ==========================================================================

  private extractVideoUri(

    operation: any,

  ): string | undefined {

    const generatedVideos =

      operation?.response

        ?.generatedVideos;

    if (

      Array.isArray(

        generatedVideos,

      ) &&

      generatedVideos.length > 0

    ) {

      const video =

        generatedVideos[0]?.video;

      return (

        video?.uri ||

        video?.gcsUri

      );

    }

    const resultVideos =

      operation?.result

        ?.generatedVideos;

    if (

      Array.isArray(

        resultVideos,

      ) &&

      resultVideos.length > 0

    ) {

      const video =

        resultVideos[0]?.video;

      return (

        video?.uri ||

        video?.gcsUri

      );

    }

    return undefined;

  }

  // ==========================================================================

  // OPERATION MODEL EXTRACTION

  // ==========================================================================

  private extractOperationModel(

    operation: any,

  ): string | undefined {

    return (

      operation?.response

        ?.model ||

      operation?.response

        ?.modelVersion ||

      operation?.metadata

        ?.model ||

      operation?.metadata

        ?.modelVersion

    );

  }

  // ==========================================================================

  // NUMBER HELPER

  // ==========================================================================

  private getPositiveNumber(

    value:

      | string

      | undefined,

    fallback: number,

  ): number {

    const parsed =

      Number(value);

    if (

      Number.isFinite(parsed) &&

      parsed > 0

    ) {

      return parsed;

    }

    return fallback;

  }

  // ==========================================================================

  // SLEEP

  // ==========================================================================

  private sleep(

    ms: number,

    signal?: AbortSignal,

  ): Promise<void> {

    return new Promise(

      (

        resolve,

        reject,

      ) => {

        let settled = false;

        const onAbort =

          () => {

            if (settled) {

              return;

            }

            settled = true;

            clearTimeout(timer);

            reject(

              new Error(

                "Veo generation was cancelled.",

              ),

            );

          };

        const timer =

          setTimeout(

            () => {

              if (settled) {

                return;

              }

              settled = true;

              if (signal) {

                signal.removeEventListener(

                  "abort",

                  onAbort,

                );

              }

              resolve();

            },

            ms,

          );

        if (signal) {

          if (signal.aborted) {

            onAbort();

            return;

          }

          signal.addEventListener(

            "abort",

            onAbort,

            {

              once: true,

            },

          );

        }

      },

    );

  }

}