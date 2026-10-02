import React, { useEffect, useState } from "react";

import {
  CreateCategoryDto,
  Category,
} from "../types/Category";

import "./CategoryModal.scss";


interface CategoryModalProps {

  open: boolean;

  category?: Category | null;

  loading?: boolean;

  onClose: () => void;

  onSave: (
    data: CreateCategoryDto
  ) => void;

}



const CategoryModal = ({
  open,
  category,
  loading,
  onClose,
  onSave,
}: CategoryModalProps) => {


  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [status, setStatus] =
    useState<"active" | "inactive">("active");




  useEffect(() => {

    if (category) {

      setName(category.name);

      setDescription(
        category.description || ""
      );

      setStatus(
        category.status as "active" | "inactive"
      );

    } else {

      setName("");

      setDescription("");

      setStatus("active");

    }

  }, [category, open]);




  if (!open) {

    return null;

  }




  const handleSubmit = (
    e: React.FormEvent
  ) => {

    e.preventDefault();


    onSave({

      name,

      description,

      status,

    });

  };





  return (

    <div className="category-modal-overlay">


      <div className="category-modal">


        <div className="category-modal-header">

          <h2>
            {category
              ? "Edit Category"
              : "Add Category"}
          </h2>

        </div>




        <form
          onSubmit={handleSubmit}
        >


          <div className="category-modal-body">


            <label>
              Name
            </label>


            <input

              value={name}

              onChange={(e) =>
                setName(e.target.value)
              }

              placeholder="Category name"

              required

            />



            <label>
              Description
            </label>


            <textarea

              value={description}

              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }

              placeholder="Category description"

            />




            <label>
              Status
            </label>


            <select

              value={status}

              onChange={(e) =>
                setStatus(
                  e.target.value as
                  "active" |
                  "inactive"
                )
              }

            >

              <option value="active">
                Active
              </option>


              <option value="inactive">
                Inactive
              </option>


            </select>


          </div>





          <div className="category-modal-actions">


            <button

              type="button"

              className="cancel-button"

              onClick={onClose}

              disabled={loading}

            >
              Cancel
            </button>




            <button

              type="submit"

              className="save-button"

              disabled={loading}

            >

              {loading
                ? "Saving..."
                : "Save"}

            </button>



          </div>


        </form>


      </div>


    </div>

  );

};


export default CategoryModal;