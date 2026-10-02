interface Props {
  property: {
    views?: number;
    favorites?: number;
    shares?: number;
    inquiries?: number;
    tourRequests?: number;
  };
}


export default function PropertyStatsCard({
  property,
}: Props) {

  const stats = [
    {
      label: "Views",
      value: property.views ?? 0,
    },
    {
      label: "Favorites",
      value: property.favorites ?? 0,
    },
    {
      label: "Shares",
      value: property.shares ?? 0,
    },
    {
      label: "Inquiries",
      value: property.inquiries ?? 0,
    },
    {
      label: "Tour Requests",
      value: property.tourRequests ?? 0,
    },
  ];


  return (

    <section className="property-card">

      <h2>
        Statistics
      </h2>


      <div className="stats-grid">

        {stats.map((item) => (

          <div
            className="stat-box"
            key={item.label}
          >

            <span>
              {item.label}
            </span>

            <strong>
              {item.value}
            </strong>

          </div>

        ))}

      </div>


    </section>

  );
}