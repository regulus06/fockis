import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import type {
  MonetizedContent,
} from "../types/contentMonetization.types";

import PaidContentCard from "../components/PaidContentCard";

interface ContentPurchasePageProps {
  content?: MonetizedContent;
}

export default function ContentPurchasePage({
  content,
}: ContentPurchasePageProps) {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const stateContent =
    location.state
      ?.content as
      | MonetizedContent
      | undefined;

  const currentContent =
    content ?? stateContent;

  if (!currentContent) {
    return (
      <main className="content-purchase-page">
        <div className="content-purchase-empty">
          <h2>
            Content not found
          </h2>

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="content-purchase-page">
      <div className="content-purchase-container">
        <button
          type="button"
          className="content-back-button"
          onClick={() =>
            navigate(-1)
          }
        >
          ← Back
        </button>

        <PaidContentCard
          content={currentContent}
        />
      </div>
    </main>
  );
}