// Public entry point for Fockis Marketing.

export {
  default as FockisMarketingRoutes,
} from "./routes/FockisMarketingRoutes";

export type {
  FockisMarketingRoutesProps,
  MarketingSection,
} from "./routes/FockisMarketingRoutes";

export {
  default as MailchimpRoutes,
} from "./routes/FockisMailRoutes";

export type {
  MailchimpRoutesProps,
} from "./routes/FockisMailRoutes";

export {
  default as MarketingRequestRoute,
} from "./routes/MarketingRequestRoute";

export {
  useMarketingWorkspace,
} from "./hooks/useMarketingWorkspace";

export * from "./services/marketingApi";

export type * from "./types/platform.types";