import {
  useNavigate,
  useParams,
} from "react-router-dom";

import CreateManagedUserModal from "../components/CreateManagedUserModal";

import {
  useOrganizationIdentities,
} from "../hooks/useOrganizationIdentities";

import {
  useOrganizationDomains,
} from "../hooks/useOrganizationDomains";

export default function OrganizationCreateUserPage() {
  const {
    organizationId = "",
  } = useParams();

  const navigate = useNavigate();

  const {
    createUser,
  } = useOrganizationIdentities(
    organizationId,
  );

  const {
    domains,
  } = useOrganizationDomains(
    organizationId,
  );

  return (
    <CreateManagedUserModal
      open
      domains={domains}
      onClose={() =>
        navigate(
          `/organizations/${organizationId}/identity/users`,
        )
      }
      onSubmit={async (payload) => {
        await createUser(payload);

        navigate(
          `/organizations/${organizationId}/identity/users`,
        );
      }}
    />
  );
}