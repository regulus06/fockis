import React from "react";
import "./AdminToolbar.scss";

interface AdminToolbarProps {
  title: string;
  description?: string;

  searchValue?: string;
  onSearchChange?: (value: string) => void;

  searchPlaceholder?: string;

  addButtonText?: string;
  onAddClick?: () => void;

  children?: React.ReactNode;
}

const AdminToolbar = ({
  title,
  description,

  searchValue = "",
  onSearchChange,

  searchPlaceholder = "Search...",

  addButtonText,
  onAddClick,

  children,
}: AdminToolbarProps) => {

  return (
    <div className="admin-toolbar">

      <div className="admin-toolbar-header">

        <div className="admin-toolbar-title">

          <h2>
            {title}
          </h2>

          {description && (
            <p>
              {description}
            </p>
          )}

        </div>


        {addButtonText && (
          <button
            className="admin-toolbar-add"
            onClick={onAddClick}
          >
            {addButtonText}
          </button>
        )}

      </div>



      <div className="admin-toolbar-actions">

        {onSearchChange && (
          <input
            className="admin-toolbar-search"
            value={searchValue}
            onChange={(e) =>
              onSearchChange(e.target.value)
            }
            placeholder={searchPlaceholder}
          />
        )}


        {children}

      </div>


    </div>
  );
};


export default AdminToolbar;