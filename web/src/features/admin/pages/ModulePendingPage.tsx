import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminEmptyState } from '../components/AdminStates';

export function ModulePendingPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <AdminPageHeader title={title} description={description} />
      <AdminEmptyState
        icon="🛠️"
        title="Scheduled for the next build phase"
        description="This module's route, permission guard, and nav entry are wired up. Its mock API, data table, and detail views will be built in the next phase."
      />
    </div>
  );
}
