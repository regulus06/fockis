interface Props {
  property: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}


export default function PropertyContactCard({
  property,
}: Props) {

  return (

    <section className="property-card">

      <h2>
        Contact Information
      </h2>


      <div className="property-grid">


        <div>
          <label>
            Contact Name
          </label>

          <p>
            {property.contactName || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Email
          </label>

          <p>
            {property.contactEmail || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Phone
          </label>

          <p>
            {property.contactPhone || "N/A"}
          </p>
        </div>


      </div>


    </section>

  );
}