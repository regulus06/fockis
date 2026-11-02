import MessagesApp from "../inbox/MessagesApp";

/**
 * Fockis Messages (redesigned). The previous page is kept in
 * LegacyMessagesPage.tsx for reference and rollback; it is not routed.
 */
export default function MessagesPage() {
  return <MessagesApp />;
}
