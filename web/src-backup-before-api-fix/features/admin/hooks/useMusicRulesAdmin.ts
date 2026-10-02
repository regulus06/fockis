import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  DEFAULT_MUSIC_RULES,
  type MusicReleaseRule,
  type MusicRulesConfig,
  type MusicPreviewRules,
  type MusicPricingRules,
  type MusicPublishingRules,
  type MusicVideoRules,
  type UpdateMusicRulesPayload,
} from '../types/musicRulesAdmin.types';

import { musicRulesAdminApi } from '../service/musicRulesAdminApi';

export function useMusicRulesAdmin() {
  const [rules, setRules] =
    useState<MusicRulesConfig>(
      DEFAULT_MUSIC_RULES,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [saved, setSaved] =
    useState(false);

  const loadRules = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await musicRulesAdminApi.getRules();

        setRules(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load music rules.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const updateReleaseRule = useCallback(
    (
      id: string,
      changes: Partial<MusicReleaseRule>,
    ) => {
      setRules((current) => ({
        ...current,

        releaseRules:
          current.releaseRules.map((rule) =>
            rule.id === id
              ? {
                  ...rule,
                  ...changes,
                }
              : rule,
          ),
      }));

      setSaved(false);
    },
    [],
  );

  const updatePreview = useCallback(
    (changes: Partial<MusicPreviewRules>) => {
      setRules((current) => ({
        ...current,

        preview: {
          ...current.preview,
          ...changes,
        },
      }));

      setSaved(false);
    },
    [],
  );

  const updatePricing = useCallback(
    (changes: Partial<MusicPricingRules>) => {
      setRules((current) => ({
        ...current,

        pricing: {
          ...current.pricing,
          ...changes,
        },
      }));

      setSaved(false);
    },
    [],
  );

  const updatePublishing = useCallback(
    (
      changes: Partial<MusicPublishingRules>,
    ) => {
      setRules((current) => ({
        ...current,

        publishing: {
          ...current.publishing,
          ...changes,
        },
      }));

      setSaved(false);
    },
    [],
  );

  const updateVideo = useCallback(
    (changes: Partial<MusicVideoRules>) => {
      setRules((current) => ({
        ...current,

        video: {
          ...current.video,
          ...changes,
        },
      }));

      setSaved(false);
    },
    [],
  );

  const saveRules = useCallback(
    async () => {
      setSaving(true);
      setError(null);
      setSaved(false);

      const payload: UpdateMusicRulesPayload = {
        releaseRules:
          rules.releaseRules,

        preview:
          rules.preview,

        pricing:
          rules.pricing,

        publishing:
          rules.publishing,

        video:
          rules.video,
      };

      try {
        const result =
          await musicRulesAdminApi.updateRules(
            payload,
          );

        setRules(result);
        setSaved(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to save music rules.',
        );
      } finally {
        setSaving(false);
      }
    },
    [rules],
  );

  const resetRules = useCallback(
    async () => {
      const confirmed =
        window.confirm(
          'Reset all music rules to the Fockis defaults?',
        );

      if (!confirmed) {
        return;
      }

      setSaving(true);
      setError(null);
      setSaved(false);

      try {
        const result =
          await musicRulesAdminApi.resetRules();

        setRules(result);
        setSaved(true);
      } catch (err) {
        setRules(DEFAULT_MUSIC_RULES);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to reset music rules.',
        );
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    rules,
    loading,
    saving,
    saved,
    error,

    reload: loadRules,

    updateReleaseRule,
    updatePreview,
    updatePricing,
    updatePublishing,
    updateVideo,

    saveRules,
    resetRules,
  };
}

export default useMusicRulesAdmin;