import { JobSearchPage } from './JobSearchPage';

/** /careers/co-ops — job listings limited to co-op positions. */
export function CoopsPage() {
  return <JobSearchPage presetKind="coop" title="Co-ops" />;
}

export default CoopsPage;
