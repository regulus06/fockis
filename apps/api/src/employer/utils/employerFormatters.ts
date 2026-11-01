export const formatEmployerDate = (value?: string) => {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
};
export const formatEmployerNumber = (value: number) => new Intl.NumberFormat().format(value);
