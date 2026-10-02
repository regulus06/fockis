/*
 * ============================================================================
 * FOCKIS ADMIN PROPERTIES HOOK
 * ============================================================================
 */

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import * as api from "../services/adminRealEstateApi";

/* ============================================================================
 * TYPES
 * ============================================================================ */

export interface AdminProperty {
  id?: string;
  _id?: string;

  title?: string;
  name?: string;

  status?: string;

  featured?: boolean;
  isFeatured?: boolean;

  price?: number;

  propertyType?: string;

  city?: string;
  state?: string;
  location?: string;

  createdAt?: string;
}

/* ============================================================================
 * HOOK
 * ============================================================================ */

export function useAdminProperties() {
  const [properties, setProperties] =
    useState<AdminProperty[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================================
   * LOAD PROPERTIES
   * ========================================================================== */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        await api.getProperties();

      const data = response?.data;

      /*
       * API returns:
       * [
       *   ...
       * ]
       */
      if (Array.isArray(data)) {
        setProperties(data);
        return;
      }

      /*
       * API returns:
       * {
       *   items: [...]
       * }
       */
      if (
        data &&
        Array.isArray(data.items)
      ) {
        setProperties(data.items);
        return;
      }

      /*
       * API returns:
       * {
       *   properties: [...]
       * }
       */
      if (
        data &&
        Array.isArray(data.properties)
      ) {
        setProperties(data.properties);
        return;
      }

      setProperties([]);
    } catch (err) {
      console.error(
        "[ADMIN PROPERTIES] Failed to load properties:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load properties.",
      );

      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ==========================================================================
   * INITIAL LOAD
   * ========================================================================== */

  useEffect(() => {
    void load();
  }, [load]);

  /* ==========================================================================
   * RETURN
   * ========================================================================== */

  return {
    properties,

    /*
     * Compatibility aliases.
     */
    data: properties,

    loading,

    error,

    refresh: load,

    refetch: load,
  };
}