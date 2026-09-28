import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import messageAdminService from '../services/messageAdminService';

import type {
  FockisIdPricing,
  FockisIdSettings,
} from '../types/messageAdmin.types';

const DEFAULT_PRICING: FockisIdPricing = {
  price: null,
  currency: 'USD',
  oneTime: true,
  recurring: false,
  requirePayment: true,
};

const DEFAULT_SETTINGS: FockisIdSettings = {
  enabled: true,
  minLength: 6,
  maxLength: 20,
  allowLetters: true,
  allowNumbers: true,
  allowUnderscore: false,
  allowHyphen: false,
};

export function useFockisIdAdmin() {
  const [pricing, setPricing] =
    useState<FockisIdPricing>(
      DEFAULT_PRICING,
    );

  const [settings, setSettings] =
    useState<FockisIdSettings>(
      DEFAULT_SETTINGS,
    );

  const [loading, setLoading] =
    useState<boolean>(true);

  const [saving, setSaving] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string | null>(null);

  const load =
    useCallback(async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const [
          pricingResult,
          settingsResult,
        ] = await Promise.all([
          messageAdminService.getFockisIdPricing(),
          messageAdminService.getFockisIdSettings(),
        ]);

        setPricing(
          pricingResult ?? DEFAULT_PRICING,
        );

        setSettings(
          settingsResult ?? DEFAULT_SETTINGS,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load Fockis ID settings.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePricing =
    useCallback(
      async (
        value: FockisIdPricing,
      ): Promise<FockisIdPricing> => {
        setSaving(true);
        setError(null);

        try {
          const normalized: FockisIdPricing = {
            price:
              value.price === null ||
              value.price === undefined
                ? null
                : Math.round(
                    Number(value.price) * 100,
                  ) / 100,

            currency:
              value.currency
                ?.trim()
                .toUpperCase() || 'USD',

            oneTime:
              value.oneTime === true,

            recurring:
              value.recurring === true,

            requirePayment:
              value.requirePayment === true,
          };

          const result =
            await messageAdminService.updateFockisIdPricing(
              normalized,
            );

          setPricing(result);

          return result;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to save Fockis ID pricing.';

          setError(message);

          throw err;
        } finally {
          setSaving(false);
        }
      },
      [],
    );

  const saveSettings =
    useCallback(
      async (
        value: FockisIdSettings,
      ): Promise<FockisIdSettings> => {
        setSaving(true);
        setError(null);

        try {
          const result =
            await messageAdminService.updateFockisIdSettings(
              value,
            );

          setSettings(result);

          return result;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to save Fockis ID settings.';

          setError(message);

          throw err;
        } finally {
          setSaving(false);
        }
      },
      [],
    );

  return {
    pricing,
    settings,
    loading,
    saving,
    error,
    savePricing,
    saveSettings,
    reload: load,
  };
}

export default useFockisIdAdmin;