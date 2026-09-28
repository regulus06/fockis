import { Injectable } from "@nestjs/common";
import { AiVideoProvider } from "./ai-provider.interface";

@Injectable()
export class MockAiProviderDisabled
  implements AiVideoProvider
{
  readonly name = "mock-disabled";

  generateVideo(): Promise<never> {
    throw new Error(
      "Mock AI generation is disabled. Configure the real Google Veo provider.",
    );
  }

  waitForVideo(): Promise<never> {
    throw new Error(
      "Mock AI generation is disabled.",
    );
  }

  cancelVideo(): Promise<void> {
    throw new Error(
      "Mock AI generation is disabled.",
    );
  }
}