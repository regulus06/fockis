import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useMemo } from "react";

import CampaignForm, {
  type CampaignFormValues,
} from "../components/CampaignForm";

import {
  useCreateCampaign,
} from "../hooks/useCreateCampaign";

import { readPreset } from "../ads/adsPresets";

import { adsErrorMessage } from "../ads/useAdsData";

import "../styles/CreateCampaignPage.scss";

export default function CreateCampaignPage() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    submit,
    loading,
    error,
  } =
    useCreateCampaign();

  /*
   * Templates on the Ads overview link here with
   * ?objective=&format=&placement=. Unknown values are ignored.
   */
  const initialValues =
    useMemo<CampaignFormValues>(
      () =>
        readPreset(
          location.search,
        ) as CampaignFormValues,
      [location.search],
    );

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
        `/ads/campaigns/${id}`,
      );
    } else {
      navigate(
        "/ads/campaigns",
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
            New campaigns are saved as drafts.
            Submit a draft for review when it is
            ready; it can run only after approval.
          </p>
        </div>
      </header>

      {error && (
        <div className="fk-marketing-error" role="alert">
          {adsErrorMessage(new Error(error), error)}
        </div>
      )}

      <section className="fk-marketing-panel">
        <CampaignForm
          key={location.search}
          loading={loading}
          initialValues={initialValues}
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  );
}
