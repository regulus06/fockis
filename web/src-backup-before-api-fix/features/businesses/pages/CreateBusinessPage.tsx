import { useNavigate } from "react-router-dom";

import BusinessForm from "../components/BusinessForm";

import "../styles/BusinessPage.scss";

export default function CreateBusinessPage() {
  const navigate = useNavigate();

  return (
    <main className="business-page">
      <div className="business-page__container">
        <BusinessForm
          onSuccess={() => {
            navigate("/businesses/manage");
          }}
          onCancel={() => {
            navigate("/businesses/manage");
          }}
        />
      </div>
    </main>
  );
}