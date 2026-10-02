import * as VapiModule from "@vapi-ai/web";

const PUBLIC_KEY = String(
  import.meta.env.VITE_VAPI_PUBLIC_KEY || "",
).trim();

const ASSISTANT_ID = String(
  import.meta.env.VITE_VAPI_ASSISTANT_ID || "",
).trim();

type MessageHandler = (message: any) => void;
type StatusHandler = (status: string) => void;
type ErrorHandler = (error: any) => void;

type VapiInstance = {
  on: (event: string, handler: (...args: any[]) => void) => void;
  start: (assistantId: string) => Promise<any>;
  stop: () => Promise<any> | void;
  send: (message: any) => void;
  setMuted: (value: boolean) => Promise<any> | void;
};

type VapiConstructor = new (publicKey: string) => VapiInstance;

function resolveVapiConstructor(): VapiConstructor {
  const moduleValue = VapiModule as any;

  const candidates = [
    moduleValue?.default,
    moduleValue?.Vapi,
    moduleValue?.default?.default,
    moduleValue,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "function") {
      return candidate as VapiConstructor;
    }
  }

  console.error("[FOCKIS VAPI] SDK module:", moduleValue);

  throw new Error(
    "Unable to load the Vapi Web SDK constructor. Check @vapi-ai/web installation.",
  );
}

class FockisVapiClient {
  private client: VapiInstance | null = null;

  private onMessage: MessageHandler = () => {};
  private onStatus: StatusHandler = () => {};
  private onError: ErrorHandler = () => {};

  configured = Boolean(PUBLIC_KEY && ASSISTANT_ID);

  init(
    onMessage: MessageHandler = () => {},
    onStatus: StatusHandler = () => {},
    onError: ErrorHandler = () => {},
  ) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.onError = onError;

    if (!this.configured) {
      this.onStatus("unconfigured");
      return null;
    }

    if (!this.client) {
      this.createClient();
    }

    this.onStatus("ready");

    return this.client;
  }

  private createClient(): VapiInstance {
    if (!PUBLIC_KEY) {
      throw new Error(
        "Missing VITE_VAPI_PUBLIC_KEY in web/.env.",
      );
    }

    if (!ASSISTANT_ID) {
      throw new Error(
        "Missing VITE_VAPI_ASSISTANT_ID in web/.env.",
      );
    }

    const Vapi = resolveVapiConstructor();

    console.log("[FOCKIS VAPI] Creating Web SDK client", {
      hasPublicKey: Boolean(PUBLIC_KEY),
      assistantId: ASSISTANT_ID,
    });

    const client = new Vapi(PUBLIC_KEY);

    client.on("call-start", () => {
      console.log("[FOCKIS VAPI] Call started");
      this.onStatus("connected");
    });

    client.on("call-end", () => {
      console.log("[FOCKIS VAPI] Call ended");
      this.onStatus("ended");
    });

    client.on("speech-start", () => {
      console.log("[FOCKIS VAPI] Speech started");
      this.onStatus("listening");
    });

    client.on("speech-end", () => {
      console.log("[FOCKIS VAPI] Speech ended");
      this.onStatus("connected");
    });

    client.on("message", (message: any) => {
      console.log("[FOCKIS VAPI] Message", message);
      this.onMessage(message);
    });

    client.on("error", (error: any) => {
      console.error("[FOCKIS VAPI] Error", error);
      this.onStatus("error");
      this.onError(error);
    });

    this.client = client;

    return client;
  }

  async start(
    onMessage?: MessageHandler,
    onStatus?: StatusHandler,
    onError?: ErrorHandler,
  ) {
    if (onMessage) this.onMessage = onMessage;
    if (onStatus) this.onStatus = onStatus;
    if (onError) this.onError = onError;

    if (!this.configured) {
      throw new Error(
        "Add VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID to web/.env.",
      );
    }

    const client = this.client || this.createClient();

    this.onStatus("connecting");

    console.log(
      "[FOCKIS VAPI] Starting assistant:",
      ASSISTANT_ID,
    );

    await client.start(ASSISTANT_ID);
  }

  async stop() {
    if (!this.client) return;

    console.log("[FOCKIS VAPI] Stopping call");

    await this.client.stop();
  }

  async sendText(content: string) {
    const text = content.trim();

    if (!text) return;

    if (!this.client) {
      throw new Error(
        "Start Fockis AI voice mode first.",
      );
    }

    this.client.send({
      type: "add-message",
      message: {
        role: "user",
        content: text,
      },
    });
  }

  async mute(value: boolean) {
    if (!this.client) return;

    await this.client.setMuted(value);
  }

  active() {
    return this.client !== null;
  }

  destroy() {
    this.client = null;
  }
}

export const vapiClient = new FockisVapiClient();

export default vapiClient;