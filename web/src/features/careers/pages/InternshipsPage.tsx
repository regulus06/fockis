import { JobSearchPage } from './JobSearchPage';

/** /careers/internships — job listings limited to internships. */
export function InternshipsPage() {
  return <JobSearchPage presetKind="internship" title="Internships" />;
}

export default InternshipsPage;
