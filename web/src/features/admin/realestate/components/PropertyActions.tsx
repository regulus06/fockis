interface Props {
  propertyId: string;

  onApprove?: () => void;
  onReject?: () => void;
  onFeature?: () => void;
  onSuspend?: () => void;
  onDelete?: () => void;

  featured?: boolean;
  status?: string;
}


export default function PropertyActions({
  propertyId,
  onApprove,
  onReject,
  onFeature,
  onSuspend,
  onDelete,
  featured,
  status,
}: Props) {


  return (

    <section className="property-card actions-card">

      <h2>
        Admin Actions
      </h2>


      <div className="actions">


        <button
          className="approve"
          onClick={onApprove}
        >
          Approve
        </button>



        <button
          className="reject"
          onClick={onReject}
        >
          Reject
        </button>



        <button
          className="feature"
          onClick={onFeature}
        >

          {
            featured
              ? "Remove Feature"
              : "Feature Property"
          }

        </button>



        <button
          className="suspend"
          onClick={onSuspend}
        >
          Suspend
        </button>



        <button
          className="delete"
          onClick={onDelete}
        >
          Delete
        </button>


      </div>


      <small>
        Property ID: {propertyId}
      </small>


    </section>

  );
}