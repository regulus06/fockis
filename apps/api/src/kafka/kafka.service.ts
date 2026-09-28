import { Injectable } from "@nestjs/common";
import { Kafka } from "kafkajs";

@Injectable()
export class KafkaService {

  private kafka = new Kafka({
    clientId: "messaging-service",
    brokers: ["localhost:9092"],
  });

  private producer = this.kafka.producer();

  async onModuleInit() {
    await this.producer.connect();
  }

  async emit(topic: string, value: any) {
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(value),
        },
      ],
    });
  }
}