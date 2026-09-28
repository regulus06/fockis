import {
  useNavigate,
} from "react-router-dom";

import CampaignForm from "../components/CampaignForm";

import {
  useCreateCampaign,
} from "../hooks/useCreateCampaign";

import "../styles/CreateCampaignPage.scss";

export default function CreateCampaignPage() {
  const navigate =
    useNavigate();

  const {
    submit,
    loading,
    error,
  } =
    useCreateCampaign();

  async function handleSubmit(
    payload: Parameters<
      typeof submit
    >[0],
  ) {
    const campaign =
      await submit(payload);

    const id =
      campaign._id ??
      campaign.id;

    if (id) {
      navigate(
        `/marketing/campaigns/${id}`,
      );
    } else {
      navigate(
        "/marketing/campaigns",
      );
    }
  }

  return (
    <main className="fk-marketing-page">
      <header className="fk-marketing-header">
        <div>
          <span className="fk-marketing-eyebrow">
            CAMPAIGN BUILDER
          </span>

          <h1>
            Create Campaign
          </h1>

          <p>
            Set up your advertising
            campaign.
          </p>
        </div>
      </header>

      {error && (
        <div className="fk-marketing-error">
          {error}
        </div>
      )}

      <section className="fk-marketing-panel">
        <CampaignForm
          loading={loading}
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  );
}