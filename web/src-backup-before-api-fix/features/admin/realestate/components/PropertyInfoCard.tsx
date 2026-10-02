interface Props {
  property: {
    title: string;
    description: string;
    price: number;
    type: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    lotSize?: number;
    yearBuilt?: number;
  };
}


export default function PropertyInfoCard({
  property,
}: Props) {

  return (

    <section className="property-card">

      <h2>
        Property Information
      </h2>


      <div className="property-grid">


        <div>
          <label>
            Title
          </label>

          <p>
            {property.title}
          </p>
        </div>



        <div>
          <label>
            Price
          </label>

          <p>
            ${property.price?.toLocaleString()}
          </p>
        </div>



        <div>
          <label>
            Type
          </label>

          <p>
            {property.type}
          </p>
        </div>



        <div>
          <label>
            Bedrooms
          </label>

          <p>
            {property.bedrooms}
          </p>
        </div>



        <div>
          <label>
            Bathrooms
          </label>

          <p>
            {property.bathrooms}
          </p>
        </div>



        <div>
          <label>
            Square Feet
          </label>

          <p>
            {property.squareFeet || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Lot Size
          </label>

          <p>
            {property.lotSize || "N/A"}
          </p>
        </div>



        <div>
          <label>
            Year Built
          </label>

          <p>
            {property.yearBuilt || "N/A"}
          </p>
        </div>


      </div>


      <div className="description">

        <label>
          Description
        </label>

        <p>
          {property.description}
        </p>

      </div>


    </section>

  );
}