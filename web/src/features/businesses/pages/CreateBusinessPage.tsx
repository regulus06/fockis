import { Link, useNavigate } from "react-router-dom";

import { ArrowLeft } from "lucide-react";

import BusinessForm from "../components/BusinessForm";

import { BUSINESS_MANAGER_ROUTE } from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessForm.scss";


/* ============================================================================
   CREATE BUSINESS PAGE
   Routes: /businesses/create, /business/create
============================================================================ */

export default function CreateBusinessPage() {
  const navigate = useNavigate();

  return (
    <main className="fkb fkb-page fkb-create">
      <div className="fkb-container">
        <Link to={BUSINESS_MANAGER_ROUTE} className="fkb-create__back">
          <ArrowLeft size={16} aria-hidden="true" />
          Business Manager
        </Link>

        <header className="fkb-create__header">
          <span className="fkb-eyebrow">New business</span>
          <h1>Create your business profile</h1>
          <p>
            Only the name, category and description are required. You can add
            everything else now or later from Business Manager.
          </p>
        </header>

        <BusinessForm
          onSuccess={(business) => {
            navigate(`${BUSINESS_MANAGER_ROUTE}?business=${encodeURIComponent(business.id)}&created=1`);
          }}
          onCancel={() => {
            navigate(BUSINESS_MANAGER_ROUTE);
          }}
        />
      </div>
    </main>
  );
}
