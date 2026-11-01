import {
  CirclePlay,
  CreditCard,
  Image,
  MessageSquare,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { TopicId } from "../types";

/** Line icons used for each help topic (as in the reference design). */
export const TOPIC_ICONS: Record<TopicId, LucideIcon> = {
  account: UserRound,
  marketplace: Store,
  profile: Image,
  messages: MessageSquare,
  waves: CirclePlay,
  technical: Settings,
  shop: ShoppingCart,
  privacy: ShieldCheck,
  payments: CreditCard,
  organizations: Users,
};
