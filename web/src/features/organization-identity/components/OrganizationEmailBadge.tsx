interface Props {
  email?: string | null;
}

export default function OrganizationEmailBadge({
  email,
}: Props) {
  if (!email?.trim()) {
    return (
      <span className="identity-email identity-email--empty">
        No organization email
      </span>
    );
  }

  return (
    <span className="identity-email">
      {email}
    </span>
  );
}