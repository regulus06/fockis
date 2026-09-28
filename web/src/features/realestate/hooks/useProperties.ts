import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  propertyApi,
  type PropertySearchParams,
  type CreatePropertyPayload,
} from "../services/propertyApi";

import type { Property } from "../types/Property";

/* ============================================================================
   USE PROPERTIES

   Responsibilities:
   - Load real-estate properties
   - Search/filter properties
   - Refresh properties
   - Create property
   - Update property
   - Delete property
   - Track loading/error state
============================================================================ */

interface UsePropertiesOptions {
  params?: PropertySearchParams;
  autoFetch?: boolean;
}

interface UsePropertiesReturn {
  properties: Property[];
  loading: boolean;
  error: string | null;

  fetchProperties: (
    nextParams?: PropertySearchParams,
  ) => Promise<void>;

  refresh: () => Promise<void>;

  createProperty: (
    payload: CreatePropertyPayload,
  ) => Promise<Property>;

  updateProperty: (
    id: string,
    payload: Partial<CreatePropertyPayload>,
  ) => Promise<Property>;

  deleteProperty: (
    id: string,
  ) => Promise<void>;
}

export function useProperties(
  options: UsePropertiesOptions = {},
): UsePropertiesReturn {
  const {
    params,
    autoFetch = true,
  } = options;

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ==========================================================================
     FETCH
  ========================================================================== */

  const fetchProperties = useCallback(
    async (
      nextParams?: PropertySearchParams,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const data =
          await propertyApi.getProperties(
            nextParams ?? params,
          );

        setProperties(
          Array.isArray(data) ? data : [],
        );
      } catch (err) {
        console.error(
          "Failed to fetch properties:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load properties",
        );

        setProperties([]);
      } finally {
        setLoading(false);
      }
    },
    [params],
  );

  /* ==========================================================================
     REFRESH
  ========================================================================== */

  const refresh = useCallback(async () => {
    await fetchProperties(params);
  }, [fetchProperties, params]);

  /* ==========================================================================
     CREATE
  ========================================================================== */

  const createProperty = useCallback(
    async (
      payload: CreatePropertyPayload,
    ): Promise<Property> => {
      setError(null);

      try {
        const property =
          await propertyApi.createProperty(
            payload,
          );

        setProperties((current) => [
          property,
          ...current,
        ]);

        return property;
      } catch (err) {
        console.error(
          "Failed to create property:",
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : "Failed to create property";

        setError(message);

        throw err;
      }
    },
    [],
  );

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  const updateProperty = useCallback(
    async (
      id: string,
      payload: Partial<CreatePropertyPayload>,
    ): Promise<Property> => {
      setError(null);

      try {
        const updated =
          await propertyApi.updateProperty(
            id,
            payload,
          );

        setProperties((current) =>
          current.map((property) =>
            property.id === id
              ? updated
              : property,
          ),
        );

        return updated;
      } catch (err) {
        console.error(
          "Failed to update property:",
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : "Failed to update property";

        setError(message);

        throw err;
      }
    },
    [],
  );

  /* ==========================================================================
     DELETE
  ========================================================================== */

  const deleteProperty = useCallback(
    async (id: string): Promise<void> => {
      setError(null);

      try {
        await propertyApi.deleteProperty(id);

        setProperties((current) =>
          current.filter(
            (property) => property.id !== id,
          ),
        );
      } catch (err) {
        console.error(
          "Failed to delete property:",
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : "Failed to delete property";

        setError(message);

        throw err;
      }
    },
    [],
  );

  /* ==========================================================================
     INITIAL LOAD / FILTER CHANGE
  ========================================================================== */

  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    void fetchProperties(params);
  }, [
    autoFetch,
    fetchProperties,
    params,
  ]);

  return {
    properties,
    loading,
    error,

    fetchProperties,
    refresh,

    createProperty,
    updateProperty,
    deleteProperty,
  };
}

export default useProperties;