export interface CareerResource {
  id: string;
  title: string;
  summary: string;
  category: 'resume' | 'interview' | 'advice' | 'certifications' | 'search';
  sections: { heading: string; points: string[] }[];
}
