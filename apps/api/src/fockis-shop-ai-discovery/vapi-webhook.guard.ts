import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class VapiWebhookGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context.switchToHttp().getRequest();

    const configuredSecret =
      this.configService.get<string>(
        "VAPI_FOCKIS_WEBHOOK_SECRET",
      );

    if (!configuredSecret) {
      throw new UnauthorizedException(
        "Vapi webhook secret is not configured.",
      );
    }

    const providedSecret =
      request.headers["x-fockis-vapi-secret"];

    if (
      typeof providedSecret !== "string" ||
      providedSecret !== configuredSecret
    ) {
      throw new UnauthorizedException(
        "Invalid Vapi webhook secret.",
      );
    }

    return true;
  }
}