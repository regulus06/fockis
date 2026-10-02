import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  marketplaceAdminApi,
} from "../service/marketplaceAdminApi";

import type {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "../types/Category";


export const useCategories = () => {

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(false);


  const loadCategories = useCallback(
    async () => {

      try {

        setLoading(true);

        const response =
          await marketplaceAdminApi.getCategories();


        setCategories(
          response.data?.categories ??
          response.data ??
          []
        );


      } catch (error) {

        console.error(
          "Failed loading categories",
          error
        );

      } finally {

        setLoading(false);

      }

    },
    []
  );


  useEffect(() => {

    loadCategories();

  }, [loadCategories]);



  const createCategory = useCallback(
    async (
      data: CreateCategoryDto
    ) => {

      await marketplaceAdminApi.createCategory(
        data
      );

      await loadCategories();

    },
    [loadCategories]
  );



  const updateCategory = useCallback(
    async (
      id: string,
      data: UpdateCategoryDto
    ) => {

      await marketplaceAdminApi.updateCategory(
        id,
        data
      );

      await loadCategories();

    },
    [loadCategories]
  );



  const deleteCategory = useCallback(
    async (
      id: string
    ) => {

      await marketplaceAdminApi.deleteCategory(
        id
      );

      await loadCategories();

    },
    [loadCategories]
  );



  return {
    categories,
    loading,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };

};