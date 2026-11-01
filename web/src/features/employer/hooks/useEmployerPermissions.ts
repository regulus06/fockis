import type { EmployerCapability } from '../types';
import { useEmployerStore } from '../store/employerStore';

/**
 * UI-only permission helper. The backend re-checks every request.
 */
export function useEmployerPermissions() {
  const me = useEmployerStore((state) => state.me);
  const capabilities = me?.capabilities ?? [];

  return {
    role: me?.role ?? null,
    isOwner: me?.isOwner ?? false,
    can: (capability: EmployerCapability) => capabilities.includes(capability),
  };
}

export default useEmployerPermissions;
