import { Injectable } from "@nestjs/common";

@Injectable()
export class GeoReplicationService {

  async replicate(region: string, event: any) {
    // send event to nearest Kafka cluster
    console.log(`Replicating to ${region}`, event);

    return true;
  }
}