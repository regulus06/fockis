import React from "react";
import "./Pagination.scss";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}


const Pagination = ({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) => {


  if (totalPages <= 1) {
    return null;
  }


  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );


  return (
    <div className="pagination">


      <button
        className="pagination-button"
        disabled={page === 1}
        onClick={() =>
          onPageChange(page - 1)
        }
      >
        Previous
      </button>



      <div className="pagination-pages">

        {pages.map((item) => (

          <button
            key={item}
            className={
              item === page
                ? "pagination-page active"
                : "pagination-page"
            }
            onClick={() =>
              onPageChange(item)
            }
          >
            {item}
          </button>

        ))}

      </div>



      <button
        className="pagination-button"
        disabled={page === totalPages}
        onClick={() =>
          onPageChange(page + 1)
        }
      >
        Next
      </button>


    </div>
  );
};


export default Pagination;