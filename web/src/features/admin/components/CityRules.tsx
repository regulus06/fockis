export default function CityRules({ rules }: any) {
  return (
    <div>
      <h3>🏙 Cities</h3>

      {rules
        ?.filter((r: any) => r.type === "city")
        .map((r: any, i: number) => (
          <div key={i}>{r.value}</div>
        ))}
    </div>
  );
}