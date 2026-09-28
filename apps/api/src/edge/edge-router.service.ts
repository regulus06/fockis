import { Injectable } from '@nestjs/common';

@Injectable()
export class EdgeRouterService {
  routeRequest(region: string, payload: any) {
    const edgeNode = this.selectEdgeNode(region);

    return {
      region,
      edgeNode,
      routed: true,
      timestamp: Date.now(),
      payloadSize: payload ? JSON.stringify(payload).length : 0,
    };
  }

  private selectEdgeNode(region: string): string {
    const map: Record<string, string> = {
      us: 'us-east-edge-1',
      eu: 'eu-central-edge-1',
      asia: 'asia-south-edge-1',
    };

    return map[region] || 'global-edge-1';
  }

  healthCheck() {
    return {
      status: 'ok',
      latency: Math.random() * 50,
    };
  }
}