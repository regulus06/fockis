import {
  Injectable,
} from "@nestjs/common";

import {
  LiveService,
} from "./live.service";

@Injectable()
export class LiveDiscoveryService {
  constructor(
    private readonly liveService: LiveService,
  ) {}

  // ==========================================================================
  // PUBLIC LIVE STREAMS
  // GET /live/public
  //
  // Uses the same live-stream discovery query as /live.
  // LiveService.getLiveStreams() already:
  // - filters status = "live"
  // - supports category filtering
  // - sorts by viewer count
  // - loads host information
  // - serializes the response for the frontend
  // ==========================================================================

  async discoverPublic(
    category?: string,
  ) {
    return this.liveService.getLiveStreams(
      category,
    );
  }

  // ==========================================================================
  // DISCOVER LIVE
  // GET /live
  // GET /live?category=gaming
  // ==========================================================================

  async discover(
    category?: string,
  ) {
    return this.liveService.getLiveStreams(
      category,
    );
  }

  // ==========================================================================
  // TRENDING
  // ==========================================================================

  async trending() {
    return this.liveService.getLiveStreams();
  }
}