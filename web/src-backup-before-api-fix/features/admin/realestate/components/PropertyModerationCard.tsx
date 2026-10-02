interface Props {
  property: {
    status?: string;
    featured?: boolean;
    verified?: boolean;
    reports?: number;
    rejectionReason?: string;
    approvedBy?: string;
    approvedAt?: string;
    suspendedAt?: string;
    suspensionReason?: string;
  };
}


export default function PropertyModerationCard({
  property,
}: Props) {

  return (

    <section className="property-card moderation-card">

      <h2>
        Moderation Information
      </h2>


      <div className="property-grid">


        <div>
          <label>
            Status
          </label>

          <p className={`status ${property.status}`}>
            {property.status || "Pending"}
          </p>
        </div>



        <div>
          <label>
            Featured
          </label>

          <p>
            {property.featured ? "Yes" : "No"}
          </p>
        </div>



        <div>
          <label>
            Verified
          </label>

          <p>
            {property.verified ? "Yes" : "No"}
          </p>
        </div>



        <div>
          <label>
            Reports
          </label>

          <p>
            {property.reports ?? 0}
          </p>
        </div>



        <div>
          <label>
            Approved By
          </label>

          <p>
            {property.approvedBy || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Approved Date
          </label>

          <p>
            {
              property.approvedAt
              ? new Date(property.approvedAt).toLocaleDateString()
              : "N/A"
            }
          </p>
        </div>


      </div>



      {
        property.rejectionReason && (

          <div className="warning-box">

            <strong>
              Rejection Reason
            </strong>

            <p>
              {property.rejectionReason}
            </p>

          </div>

        )
      }



      {
        property.suspensionReason && (

          <div className="warning-box">

            <strong>
              Suspension Reason
            </strong>

            <p>
              {property.suspensionReason}
            </p>

          </div>

        )
      }



    </section>

  );
}