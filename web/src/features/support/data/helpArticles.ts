import type { HelpArticle } from "../types";

/**
 * Fockis Help Center articles (maintained in code). Each article only
 * describes pages that exist in the app and links straight to them.
 */
export const HELP_ARTICLES: HelpArticle[] = [
  /* ---------------- Account & Login ---------------- */
  {
    id: "reset-password",
    topic: "account",
    title: "Reset a forgotten password",
    summary: "Get back into your account when you can't remember your password.",
    body: [
      {
        steps: [
          "On the sign-in page, choose “Forgot password”.",
          "Enter the email address on your Fockis account.",
          "Open the reset email and follow the link to choose a new password.",
          "Sign in with your new password.",
        ],
      },
      { text: "If the email doesn't arrive within a few minutes, check your spam folder. Still nothing? Contact Support from the account you can still access, or from a friend's device, and tell us your username." },
    ],
    links: [{ label: "Reset password", to: "/forgot-password" }],
    keywords: ["forgot", "password", "login", "sign in", "reset", "locked out"],
  },
  {
    id: "change-account-details",
    topic: "account",
    title: "Change your email, username or password",
    summary: "Update your sign-in details from Settings.",
    body: [
      {
        steps: [
          "Open Settings.",
          "Change your username, or start an email change. Fockis sends a code to confirm the new address.",
          "To change your password, enter your current password and a new one that meets the strength checks.",
        ],
      },
      { text: "Use a password you don't use anywhere else. Avoid your name, username or email in it." },
    ],
    links: [{ label: "Open Settings", to: "/settings" }],
    keywords: ["email", "username", "password", "change", "update", "settings"],
  },
  {
    id: "hacked-account",
    topic: "account",
    title: "If you think your account was hacked",
    summary: "Steps to take right away if someone else got into your account.",
    body: [
      {
        steps: [
          "Change your password in Settings straight away. If you can't sign in, reset it from the sign-in page.",
          "Check your email address in Settings is still yours.",
          "Review recent posts and messages and delete anything you didn't send.",
          "Contact Support and choose “Privacy & Security” so we can help secure the account.",
        ],
      },
    ],
    links: [
      { label: "Settings", to: "/settings" },
      { label: "Reset password", to: "/forgot-password" },
      { label: "Contact Support", to: "/help/contact?topic=privacy" },
    ],
    keywords: ["hacked", "compromised", "stolen", "someone else", "security"],
  },

  /* ---------------- Marketplace & Business ---------------- */
  {
    id: "create-business",
    topic: "marketplace",
    title: "Create a business page",
    summary: "Set up a business on Fockis and manage it from the Business Manager.",
    body: [
      { steps: ["Go to Businesses and choose to create a business.", "Add your business details and save.", "Manage it later from the Business Manager."] },
    ],
    links: [
      { label: "Businesses", to: "/businesses" },
      { label: "Create a business", to: "/businesses/create" },
      { label: "Business Manager", to: "/business/manager" },
    ],
    keywords: ["business", "page", "store", "company"],
  },
  {
    id: "advertising",
    topic: "marketplace",
    title: "Advertise on Fockis",
    summary: "Run ads and campaigns, and the rules ads must follow.",
    body: [
      { text: "Ads and campaigns are managed in Fockis Marketing. Every ad must follow the Shop & Advertising Policy." },
    ],
    links: [
      { label: "Fockis Marketing", to: "/marketing/dashboard" },
      { label: "Shop & Advertising Policy", to: "/shop-advertising" },
    ],
    keywords: ["ads", "advertising", "campaign", "promote", "marketing"],
  },
  {
    id: "marketplace-listings",
    topic: "marketplace",
    title: "Buying on the Marketplace",
    summary: "Browse listings, save items and use your cart.",
    body: [
      { text: "Open Marketplace from the sidebar to browse listings. Items you add go to your Marketplace cart, and saved items are kept in your wishlist." },
      { text: "If a listing looks like a scam, report it from Safety & Security and don't send payment outside Fockis." },
    ],
    links: [
      { label: "Marketplace", to: "/marketplace" },
      { label: "Cart", to: "/marketplace/cart" },
      { label: "Wishlist", to: "/marketplace/wishlist" },
    ],
    keywords: ["marketplace", "listing", "buy", "cart", "wishlist"],
  },

  /* ---------------- Profile & Feed ---------------- */
  {
    id: "edit-profile",
    topic: "profile",
    title: "Edit your profile and photo",
    summary: "Change how you appear on Fockis.",
    body: [
      { text: "Open your profile to edit your public details. Your profile photo and name can also be changed from Settings." },
    ],
    links: [
      { label: "My profile", to: "/profile" },
      { label: "Settings", to: "/settings" },
    ],
    keywords: ["profile", "photo", "picture", "avatar", "bio", "name"],
  },
  {
    id: "report-post",
    topic: "profile",
    title: "Report a post or an account",
    summary: "Tell Fockis about content that breaks the Community Guidelines.",
    body: [
      {
        steps: [
          "Open the menu on the post, or on the person's profile.",
          "Choose Report and pick the reason that fits best.",
          "Add details if they help, then send the report.",
        ],
      },
      { text: "The person you report is not told who reported them. You can follow your reports and any decisions on My Moderation." },
    ],
    links: [
      { label: "My reports & decisions", to: "/moderation" },
      { label: "Community Guidelines", to: "/community-guidelines" },
    ],
    keywords: ["report", "post", "comment", "abuse", "harassment", "spam", "fake account"],
  },
  {
    id: "friends-followers",
    topic: "profile",
    title: "Manage friends and requests",
    summary: "Accept requests, find people you may know and remove friends.",
    body: [
      { text: "Friends shows your friends, incoming requests, requests you've sent and suggestions." },
    ],
    links: [
      { label: "Friends", to: "/friends" },
      { label: "Friend requests", to: "/friends/requests" },
      { label: "Suggestions", to: "/friends/suggestions" },
    ],
    keywords: ["friends", "followers", "requests", "follow", "unfriend"],
  },

  /* ---------------- Messages ---------------- */
  {
    id: "messages-basics",
    topic: "messages",
    title: "Send and manage messages",
    summary: "Chat with friends in Fockis Messages.",
    body: [{ text: "Open Messages from the sidebar or the message icon in the top bar to start or continue a conversation." }],
    links: [{ label: "Messages", to: "/messages" }],
    keywords: ["messages", "chat", "inbox", "dm", "conversation"],
  },
  {
    id: "block-someone",
    topic: "messages",
    title: "Block someone",
    summary: "Stop someone from contacting you, and see who you've blocked.",
    body: [
      { text: "You can block a person from their profile. Everyone you've blocked is listed in Friends → Blocked, where you can also unblock them." },
      { text: "If someone is threatening or harassing you, report them as well as blocking them." },
    ],
    links: [
      { label: "Blocked people", to: "/friends/blocked" },
      { label: "Safety & Security", to: "/help/safety" },
    ],
    keywords: ["block", "unblock", "blocked", "harassment", "stop messages"],
  },
  {
    id: "notifications",
    topic: "messages",
    title: "Notifications",
    summary: "Where to find your notifications.",
    body: [{ text: "Select the bell in the top bar to see your latest notifications, including replies from Fockis Support." }],
    keywords: ["notifications", "bell", "alerts"],
  },

  /* ---------------- Waves & Live ---------------- */
  {
    id: "go-live",
    topic: "waves",
    title: "Go live on Fockis",
    summary: "Start a live stream from Live Studio.",
    body: [
      { steps: ["Open Live Studio.", "Set up your stream details.", "Start the stream when you're ready. Manage past and scheduled streams in Live Manager."] },
    ],
    links: [
      { label: "Live Studio", to: "/live/studio" },
      { label: "Live Manager", to: "/live/manager" },
    ],
    keywords: ["live", "stream", "broadcast", "go live", "studio"],
  },
  {
    id: "waves",
    topic: "waves",
    title: "Watch and share Waves",
    summary: "Short videos on Fockis.",
    body: [{ text: "Open Waves from the sidebar to watch short videos. Report any Wave that breaks the Community Guidelines." }],
    links: [{ label: "Waves", to: "/waves" }],
    keywords: ["waves", "video", "upload", "reels", "shorts"],
  },
  {
    id: "gifts-coins",
    topic: "waves",
    title: "Gifts and coins",
    summary: "Buy coins, send gifts and see your gift history.",
    body: [
      { text: "Gifts are bought with coins from your Fockis wallet. You can see gifts you've sent and received in your gift history. Creators can follow their earnings and cash out from Earnings." },
    ],
    links: [
      { label: "Buy coins", to: "/wallet/buy-coins" },
      { label: "Gift history", to: "/gifts/history" },
      { label: "Earnings", to: "/earnings" },
    ],
    keywords: ["gifts", "coins", "wallet", "earnings", "cash out", "creator"],
  },

  /* ---------------- Technical Issues ---------------- */
  {
    id: "page-not-loading",
    topic: "technical",
    title: "A page won't load or looks broken",
    summary: "Quick fixes to try before reporting a problem.",
    body: [
      {
        steps: [
          "Refresh the page.",
          "Check your internet connection, then check System Status below to see whether Fockis is reachable.",
          "Sign out and back in.",
          "Try another browser, or clear this site's cache and cookies.",
          "Still broken? Report a Problem and include the page address — we add your browser and device automatically.",
        ],
      },
    ],
    links: [
      { label: "System Status", to: "/help/status" },
      { label: "Report a Problem", to: "/help/report-problem" },
    ],
    keywords: ["loading", "blank", "error", "broken", "crash", "slow", "bug"],
  },
  {
    id: "upload-failed",
    topic: "technical",
    title: "Uploads fail or stop part-way",
    summary: "What to check when a photo or video won't upload.",
    body: [
      { text: "Large files need a steady connection. Try again on Wi-Fi, keep the page open until the upload finishes, and make sure the file is a common image or video format." },
      { text: "If it keeps failing, report a problem with the file type and size." },
    ],
    links: [{ label: "Report a Problem", to: "/help/report-problem?topic=technical" }],
    keywords: ["upload", "video", "photo", "file", "failed"],
  },

  /* ---------------- Fockis Shop ---------------- */
  {
    id: "track-order",
    topic: "shop",
    title: "Find and track your orders",
    summary: "See your Fockis Shop orders and their status.",
    body: [{ text: "Your orders and their details are in Orders. Open an order to see its items and status." }],
    links: [
      { label: "My orders", to: "/shop/orders" },
      { label: "Fockis Shop", to: "/shop" },
    ],
    keywords: ["order", "track", "delivery", "status", "purchase"],
  },
  {
    id: "shop-returns",
    topic: "shop",
    title: "Returns and refunds",
    summary: "How to ask for a return or refund on a Fockis Shop order.",
    body: [
      {
        steps: [
          "Open the order in Orders and note the order number.",
          "Contact Support, choose “Fockis Shop” and include the order number, the item, and what went wrong.",
          "Add photos of damaged or wrong items if you have them.",
        ],
      },
      { text: "Support will reply on your ticket with next steps. Refunds go back to the original payment method." },
    ],
    links: [
      { label: "My orders", to: "/shop/orders" },
      { label: "Contact Support", to: "/help/contact?topic=shop" },
    ],
    keywords: ["return", "refund", "damaged", "wrong item", "money back"],
  },
  {
    id: "shop-shipping",
    topic: "shop",
    title: "Shipping and delivery",
    summary: "What to do if an order is late or hasn't arrived.",
    body: [
      { text: "Check the order's status in Orders first. If it's late or marked delivered but you don't have it, contact Support with the order number." },
    ],
    links: [
      { label: "My orders", to: "/shop/orders" },
      { label: "Contact Support", to: "/help/contact?topic=shop" },
    ],
    keywords: ["shipping", "delivery", "late", "not arrived", "lost"],
  },
  {
    id: "sell-on-shop",
    topic: "shop",
    title: "Sell on Fockis Shop",
    summary: "Open a store and list products.",
    body: [{ text: "Start selling from Sell on Fockis Shop. Products must follow the Shop & Advertising Policy." }],
    links: [
      { label: "Sell on Fockis Shop", to: "/shop/sell" },
      { label: "Seller Center", to: "/seller" },
      { label: "Shop & Advertising Policy", to: "/shop-advertising" },
    ],
    keywords: ["sell", "seller", "store", "products", "listing"],
  },

  /* ---------------- Privacy & Security ---------------- */
  {
    id: "privacy-data",
    topic: "privacy",
    title: "How Fockis uses your data",
    summary: "Read the Privacy Policy and Terms.",
    body: [{ text: "The Privacy Policy explains what Fockis collects and why. The Terms explain the rules for using Fockis." }],
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
    keywords: ["privacy", "data", "gdpr", "personal information"],
  },
  {
    id: "moderation-appeals",
    topic: "privacy",
    title: "Moderation decisions and appeals",
    summary: "See actions taken on your account or posts and appeal them.",
    body: [
      { text: "If Fockis removed your content or restricted your account, the decision and reason appear on My Moderation. You can appeal a decision there if you think it was a mistake." },
    ],
    links: [{ label: "My Moderation", to: "/moderation" }],
    keywords: ["appeal", "removed", "suspended", "restricted", "banned", "warning"],
  },
  {
    id: "child-safety",
    topic: "privacy",
    title: "Child safety",
    summary: "How Fockis protects young people, and how to report a concern.",
    body: [
      { text: "Read the Child Safety standards. If a child is in immediate danger, contact your local emergency services first, then report the content or account on Fockis." },
    ],
    links: [{ label: "Child Safety", to: "/child-safety" }],
    keywords: ["child", "minor", "underage", "safety", "exploitation"],
  },

  /* ---------------- Payments & Subscriptions ---------------- */
  {
    id: "manage-subscription",
    topic: "payments",
    title: "Manage or cancel a subscription",
    summary: "Change your plan, see billing, or cancel.",
    body: [
      { text: "Subscriptions shows your current plan. Billing lists your payments. You can cancel from the cancel page; payments are processed securely by Stripe." },
    ],
    links: [
      { label: "Subscriptions", to: "/subscriptions" },
      { label: "Billing", to: "/subscriptions/billing" },
      { label: "Cancel subscription", to: "/subscriptions/cancel" },
      { label: "Plans", to: "/subscriptions/plans" },
    ],
    keywords: ["subscription", "plan", "upgrade", "cancel", "billing", "stripe", "premium"],
  },
  {
    id: "payment-problem",
    topic: "payments",
    title: "A payment failed or I was charged twice",
    summary: "What to do about a payment problem.",
    body: [
      {
        steps: [
          "Check Payments and Billing to see the charge.",
          "If a card payment failed, check the card details and try again.",
          "If you were charged twice or for something you didn't buy, contact Support under “Payments & Subscriptions” with the date and amount. Never send your full card number.",
        ],
      },
    ],
    links: [
      { label: "Payments", to: "/payments" },
      { label: "Billing", to: "/subscriptions/billing" },
      { label: "Contact Support", to: "/help/contact?topic=payments" },
    ],
    keywords: ["charged", "payment", "failed", "card", "double", "refund", "stripe"],
  },
  {
    id: "wallet-cash-out",
    topic: "payments",
    title: "Wallet and cash out",
    summary: "Your Fockis wallet balance and creator payouts.",
    body: [{ text: "Your wallet shows your coin balance. Creators can request a payout from Cash Out once they have earnings." }],
    links: [
      { label: "Wallet", to: "/wallet" },
      { label: "Cash out", to: "/earnings/cash-out" },
    ],
    keywords: ["wallet", "balance", "cash out", "payout", "withdraw"],
  },

  /* ---------------- Organizations ---------------- */
  {
    id: "create-organization",
    topic: "organizations",
    title: "Create an organization",
    summary: "Set up a church, group or organization on Fockis.",
    body: [
      { steps: ["Open Organizations.", "Choose to create a new organization and add its details.", "Invite members and manage it from the organization's admin area."] },
    ],
    links: [
      { label: "Organizations", to: "/organizations" },
      { label: "New organization", to: "/organizations/new" },
    ],
    keywords: ["organization", "church", "group", "create", "admin"],
  },
  {
    id: "organization-members",
    topic: "organizations",
    title: "Member portal and events",
    summary: "For members of an organization.",
    body: [
      { text: "Members can open their organization's member portal to see what's shared with them. Events you've joined are in Events → My RSVPs." },
    ],
    links: [
      { label: "Member portal", to: "/organization/member-portal" },
      { label: "Events", to: "/events" },
      { label: "My RSVPs", to: "/events/my-rsvps" },
    ],
    keywords: ["member", "portal", "events", "rsvp", "church"],
  },
];

export const articleById = (id: string | undefined) => HELP_ARTICLES.find((a) => a.id === id);
