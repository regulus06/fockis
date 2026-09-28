export default function CountryRules({ rules }: any) {
  return (
    <div>
      <h3>🌍 Countries</h3>

      {rules
        ?.filter((r: any) => r.type === "country")
        .map((r: any, i: number) => (
          <div key={i}>{r.value}</div>
        ))}
    </div>
  );
}