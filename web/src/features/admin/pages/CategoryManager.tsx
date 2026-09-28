import {
  useState,
} from "react";

import AdminTable from "../../../shared/admin/AdminTable/AdminTable";
import AdminToolbar from "../../../shared/admin/AdminToolbar/AdminToolbar";
import SearchInput from "../../../shared/admin/SearchInput/SearchInput";
import StatusBadge from "../../../shared/admin/StatusBadge/StatusBadge";
import ConfirmDeleteModal from "../../../shared/admin/ConfirmDeleteMadal/ConfirmDeleteModal";
import Pagination from "../../../shared/admin/Pagination/Pagination";

import CategoryModal from "../components/CategoryModal";

import {
  useCategories,
} from "../hooks/useCategories";

import type {
  Category,
  CreateCategoryDto,
} from "../types/Category";

import "../styles/CategoryManager.scss";


export default function CategoryManager() {


  const {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();



  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [deleteId, setDeleteId] =
    useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [saving, setSaving] =
    useState(false);



  const handleSave = async (
    data: CreateCategoryDto
  ) => {

    try {

      setSaving(true);


      if (selectedCategory) {

        await updateCategory(
          selectedCategory._id,
          data
        );

      } else {

        await createCategory(
          data
        );

      }


      setModalOpen(false);
      setSelectedCategory(null);


    } catch (error) {

      console.error(
        "Category save failed",
        error
      );

    } finally {

      setSaving(false);

    }

  };



  const handleDelete = async () => {

    if (!deleteId)
      return;


    try {

      setDeleteLoading(true);


      await deleteCategory(
        deleteId
      );


      setDeleteId(null);


    } catch (error) {

      console.error(
        "Category delete failed",
        error
      );

    } finally {

      setDeleteLoading(false);

    }

  };



  const filteredCategories =
    categories.filter(
      (category) =>
        category.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );



  const columns = [

    {
      key: "name",
      title: "Category",
    },


    {
      key: "description",
      title: "Description",
    },


    {
      key: "productCount",
      title: "Products",
      align: "center" as const,
    },


    {
      key: "status",
      title: "Status",

      render: (
        row: Category
      ) => (

        <StatusBadge
          status={row.status}
        />

      ),
    },


    {
      key: "actions",
      title: "Actions",

      align: "right" as const,

      render: (
        row: Category
      ) => (

        <div className="category-actions">

          <button
            className="edit-button"
            onClick={() => {

              setSelectedCategory(row);
              setModalOpen(true);

            }}
          >
            Edit
          </button>


          <button
            className="delete-button"
            onClick={() =>
              setDeleteId(row._id)
            }
          >
            Delete
          </button>


        </div>

      ),
    },

  ];



  return (

    <div className="category-manager">


      <AdminToolbar

        title="Categories"

        description="Manage marketplace categories"

        addButtonText="Add Category"

        onAddClick={() => {

          setSelectedCategory(null);
          setModalOpen(true);

        }}

      />



      <SearchInput

        value={search}

        onChange={(value) => {

          setSearch(value);
          setPage(1);

        }}

        placeholder="Search categories..."

      />



      <AdminTable

        columns={columns}

        data={filteredCategories}

        loading={loading}

        rowKey="_id"

        emptyMessage="No categories found"

      />



      <Pagination

        page={page}

        totalPages={1}

        onPageChange={setPage}

      />



      <ConfirmDeleteModal

        open={!!deleteId}

        title="Delete Category"

        message="This action cannot be undone."

        loading={deleteLoading}

        onCancel={() =>
          setDeleteId(null)
        }

        onConfirm={handleDelete}

      />



      <CategoryModal

        open={modalOpen}

        category={selectedCategory}

        loading={saving}

        onClose={() => {

          setModalOpen(false);
          setSelectedCategory(null);

        }}

        onSave={handleSave}

      />


    </div>

  );

}