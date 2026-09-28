import React from "react";
import "./ConfirmDeleteModal.scss";

interface ConfirmDeleteModalProps {
  open: boolean;

  title?: string;

  message?: string;

  confirmText?: string;

  cancelText?: string;

  loading?: boolean;

  onConfirm: () => void;

  onCancel: () => void;
}


const ConfirmDeleteModal = ({
  open,

  title = "Confirm Delete",

  message = "Are you sure you want to delete this item?",

  confirmText = "Delete",

  cancelText = "Cancel",

  loading = false,

  onConfirm,

  onCancel,

}: ConfirmDeleteModalProps) => {


  if (!open) {
    return null;
  }


  return (
    <div className="confirm-modal-overlay">

      <div className="confirm-modal">


        <div className="confirm-modal-header">

          <h3>
            {title}
          </h3>

        </div>



        <div className="confirm-modal-body">

          <p>
            {message}
          </p>

        </div>



        <div className="confirm-modal-actions">


          <button
            type="button"
            className="confirm-modal-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>



          <button
            type="button"
            className="confirm-modal-delete"
            onClick={onConfirm}
            disabled={loading}
          >

            {loading
              ? "Deleting..."
              : confirmText
            }

          </button>


        </div>


      </div>

    </div>
  );
};


export default ConfirmDeleteModal;