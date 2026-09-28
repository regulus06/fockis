import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { savedApi } from "../services/savedApi";


/* ============================================================================
   TYPES
============================================================================ */

export interface SavedPostRef {
  _id?: string;
  id?: string;
  content?: string;
  [key: string]: unknown;
}


export interface SavedItem {
  _id: string;
  postId?: SavedPostRef | string;
  createdAt?: string;
  [key: string]: unknown;
}


/* ============================================================================
   NORMALIZE SAVED RESPONSE
============================================================================ */

function normalizeSavedResponse(
  response: unknown,
): SavedItem[] {

  if (Array.isArray(response)) {
    return response as SavedItem[];
  }


  if (
    response &&
    typeof response === "object"
  ) {

    const data =
      response as {
        items?: unknown;
        data?: unknown;
        saved?: unknown;
      };


    if (Array.isArray(data.items)) {
      return data.items as SavedItem[];
    }


    if (Array.isArray(data.data)) {
      return data.data as SavedItem[];
    }


    if (Array.isArray(data.saved)) {
      return data.saved as SavedItem[];
    }

  }


  return [];
}


/* ============================================================================
   USE SAVED
============================================================================ */

export function useSaved() {

  const [
    saved,
    setSaved,
  ] = useState<SavedItem[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<string | null>(null);


  /* ==========================================================================
     LOAD SAVED POSTS
  ========================================================================== */

  const refresh =
    useCallback(
      async () => {

        setLoading(true);
        setError(null);

        try {

          const response =
            await savedApi.getSaved();

          const normalized =
            normalizeSavedResponse(
              response,
            );

          setSaved(normalized);

        } catch (err) {

          console.error(
            "Failed loading saved posts:",
            err,
          );

          setError(
            "Unable to load your saved posts.",
          );

          setSaved([]);

        } finally {

          setLoading(false);

        }

      },
      [],
    );


  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {

    void refresh();

  }, [refresh]);


  /* ==========================================================================
     SAVE POST
  ========================================================================== */

  const save =
    useCallback(
      async (
        postId: string,
      ) => {

        if (!postId) {

          console.error(
            "Cannot save post: missing postId",
          );

          return false;
        }


        try {

          await savedApi.save(postId);


          /*
           * Reload from the backend so the frontend
           * always matches MongoDB.
           */

          await refresh();


          return true;

        } catch (err) {

          console.error(
            "Failed saving post:",
            err,
          );

          setError(
            "Unable to save this post.",
          );

          return false;

        }

      },
      [refresh],
    );


  /* ==========================================================================
     REMOVE SAVED POST
  ========================================================================== */

  const remove =
    useCallback(
      async (
        postId: string,
      ) => {

        const previous =
          saved;


        /*
         * Optimistically remove the post from
         * the current UI.
         */

        setSaved(
          (current) =>
            current.filter(
              (item) => {

                const itemPostId =
                  typeof item.postId ===
                  "string"
                    ? item.postId
                    : item.postId?._id ||
                      item.postId?.id;


                return (
                  String(itemPostId) !==
                  String(postId)
                );

              },
            ),
        );


        try {

          await savedApi.remove(postId);

        } catch (err) {

          console.error(
            "Failed removing saved post:",
            err,
          );


          /*
           * Restore the previous state
           * if the backend request failed.
           */

          setSaved(previous);

        }

      },
      [saved],
    );


  /* ==========================================================================
     RETURN
  ========================================================================== */

  return {

    saved,

    loading,

    error,

    refresh,

    save,

    remove,

  };

}