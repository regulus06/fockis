interface Props {
  property: {
    location?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
  };
}


export default function PropertyLocationCard({
  property,
}: Props) {

  return (

    <section className="property-card">

      <h2>
        Location
      </h2>


      <div className="property-grid">


        <div>
          <label>
            Address
          </label>

          <p>
            {property.location || "N/A"}
          </p>
        </div>



        <div>
          <label>
            City
          </label>

          <p>
            {property.city || "N/A"}
          </p>
        </div>



        <div>
          <label>
            State
          </label>

          <p>
            {property.state || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Country
          </label>

          <p>
            {property.country || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Zip Code
          </label>

          <p>
            {property.zipCode || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Latitude
          </label>

          <p>
            {property.latitude ?? "N/A"}
          </p>
        </div>



        <div>
          <label>
            Longitude
          </label>

          <p>
            {property.longitude ?? "N/A"}
          </p>
        </div>


      </div>


      <div className="map-placeholder">

        <p>
          Map integration goes here
        </p>

      </div>


    </section>

  );
}