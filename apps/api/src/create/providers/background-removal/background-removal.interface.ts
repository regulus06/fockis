export interface BackgroundRemovalOptions {
  replacementColor?: string;
  replacementImagePath?: string;
}

export interface BackgroundRemovalResult {
  outputPath: string;
  provider: string;
}

export interface BackgroundRemovalProvider {
  readonly name: string;
  removeBackground(
    inputPath: string,
    outputPath: string,
    options?: BackgroundRemovalOptions,
  ): Promise<BackgroundRemovalResult>;
}

export const BACKGROUND_REMOVAL_PROVIDER = 'BACKGROUND_REMOVAL_PROVIDER';
