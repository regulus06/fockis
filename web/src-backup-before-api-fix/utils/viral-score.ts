export function calculateViralScore(item: any) {
  const likesWeight = 3;
  const commentWeight = 5;
  const shareWeight = 8;
  const viewWeight = 1;

  const ageHours =
    (Date.now() - new Date(item.createdAt).getTime()) /
    (1000 * 60 * 60);

  const decay = ageHours * 0.02;

  return (
    (item.likes || 0) * likesWeight +
    (item.comments?.length || 0) * commentWeight +
    (item.shares || 0) * shareWeight +
    (item.views || 0) * viewWeight -
    decay
  );
}