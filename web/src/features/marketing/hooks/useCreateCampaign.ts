import {
  useState,
} from "react";

import {
  createCampaign,
} from "../services/campaignApi";

import type {
  Campaign,
  CreateCampaignPayload,
} from "../types/marketingTypes";

export function useCreateCampaign() {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    campaign,
    setCampaign,
  ] = useState<Campaign | null>(
    null,
  );

  async function submit(
    payload: CreateCampaignPayload,
  ) {
    try {
      setLoading(true);
      setError(null);

      const result =
        await createCampaign(
          payload,
        );

      setCampaign(result);

      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create campaign.";

      setError(message);

      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    submit,
    campaign,
    loading,
    error,
  };
}