/**
 * Starting Help Center content. Inserted once, when help_articles is empty,
 * as published items. After that the Help Articles Manager is the source of truth.
 */
export interface HelpSeedItem {
  slug: string;
  kind: "article" | "faq";
  topic: string;
  title: string;
  summary: string;
  body: { heading: string; text: string; steps: string[]; imageUrl: string }[];
  links: { label: string; to: string }[];
  keywords: string[];
  order: number;
  featured: boolean;
}

export const HELP_SEED: HelpSeedItem[] = [
  {
    "slug": "reset-password",
    "kind": "article",
    "topic": "account",
    "title": "Reset a forgotten password",
    "summary": "Get back into your account when you can't remember your password.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "On the sign-in page, choose “Forgot password”.",
          "Enter the email address on your Fockis account.",
          "Open the reset email and follow the link to choose a new password.",
          "Sign in with your new password."
        ],
        "imageUrl": ""
      },
      {
        "heading": "",
        "text": "If the email doesn't arrive within a few minutes, check your spam folder. Still nothing? Contact Support from the account you can still access, or from a friend's device, and tell us your username.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Reset password",
        "to": "/forgot-password"
      }
    ],
    "keywords": [
      "forgot",
      "password",
      "login",
      "sign in",
      "reset",
      "locked out"
    ],
    "order": 0,
    "featured": false
  },
  {
    "slug": "change-account-details",
    "kind": "article",
    "topic": "account",
    "title": "Change your email, username or password",
    "summary": "Update your sign-in details from Settings.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Open Settings.",
          "Change your username, or start an email change. Fockis sends a code to confirm the new address.",
          "To change your password, enter your current password and a new one that meets the strength checks."
        ],
        "imageUrl": ""
      },
      {
        "heading": "",
        "text": "Use a password you don't use anywhere else. Avoid your name, username or email in it.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Open Settings",
        "to": "/settings"
      }
    ],
    "keywords": [
      "email",
      "username",
      "password",
      "change",
      "update",
      "settings"
    ],
    "order": 1,
    "featured": false
  },
  {
    "slug": "hacked-account",
    "kind": "article",
    "topic": "account",
    "title": "If you think your account was hacked",
    "summary": "Steps to take right away if someone else got into your account.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Change your password in Settings straight away. If you can't sign in, reset it from the sign-in page.",
          "Check your email address in Settings is still yours.",
          "Review recent posts and messages and delete anything you didn't send.",
          "Contact Support and choose “Privacy & Security” so we can help secure the account."
        ],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Settings",
        "to": "/settings"
      },
      {
        "label": "Reset password",
        "to": "/forgot-password"
      },
      {
        "label": "Contact Support",
        "to": "/help/contact?topic=privacy"
      }
    ],
    "keywords": [
      "hacked",
      "compromised",
      "stolen",
      "someone else",
      "security"
    ],
    "order": 2,
    "featured": false
  },
  {
    "slug": "create-business",
    "kind": "article",
    "topic": "marketplace",
    "title": "Create a business page",
    "summary": "Set up a business on Fockis and manage it from the Business Manager.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Go to Businesses and choose to create a business.",
          "Add your business details and save.",
          "Manage it later from the Business Manager."
        ],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Businesses",
        "to": "/businesses"
      },
      {
        "label": "Create a business",
        "to": "/businesses/create"
      },
      {
        "label": "Business Manager",
        "to": "/business/manager"
      }
    ],
    "keywords": [
      "business",
      "page",
      "store",
      "company"
    ],
    "order": 3,
    "featured": false
  },
  {
    "slug": "advertising",
    "kind": "article",
    "topic": "marketplace",
    "title": "Advertise on Fockis",
    "summary": "Run ads and campaigns, and the rules ads must follow.",
    "body": [
      {
        "heading": "",
        "text": "Ads and campaigns are managed in Fockis Marketing. Every ad must follow the Shop & Advertising Policy.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Fockis Marketing",
        "to": "/marketing/dashboard"
      },
      {
        "label": "Shop & Advertising Policy",
        "to": "/shop-advertising"
      }
    ],
    "keywords": [
      "ads",
      "advertising",
      "campaign",
      "promote",
      "marketing"
    ],
    "order": 4,
    "featured": false
  },
  {
    "slug": "marketplace-listings",
    "kind": "article",
    "topic": "marketplace",
    "title": "Buying on the Marketplace",
    "summary": "Browse listings, save items and use your cart.",
    "body": [
      {
        "heading": "",
        "text": "Open Marketplace from the sidebar to browse listings. Items you add go to your Marketplace cart, and saved items are kept in your wishlist.",
        "steps": [],
        "imageUrl": ""
      },
      {
        "heading": "",
        "text": "If a listing looks like a scam, report it from Safety & Security and don't send payment outside Fockis.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Marketplace",
        "to": "/marketplace"
      },
      {
        "label": "Cart",
        "to": "/marketplace/cart"
      },
      {
        "label": "Wishlist",
        "to": "/marketplace/wishlist"
      }
    ],
    "keywords": [
      "marketplace",
      "listing",
      "buy",
      "cart",
      "wishlist"
    ],
    "order": 5,
    "featured": false
  },
  {
    "slug": "edit-profile",
    "kind": "article",
    "topic": "profile",
    "title": "Edit your profile and photo",
    "summary": "Change how you appear on Fockis.",
    "body": [
      {
        "heading": "",
        "text": "Open your profile to edit your public details. Your profile photo and name can also be changed from Settings.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "My profile",
        "to": "/profile"
      },
      {
        "label": "Settings",
        "to": "/settings"
      }
    ],
    "keywords": [
      "profile",
      "photo",
      "picture",
      "avatar",
      "bio",
      "name"
    ],
    "order": 6,
    "featured": false
  },
  {
    "slug": "report-post",
    "kind": "article",
    "topic": "profile",
    "title": "Report a post or an account",
    "summary": "Tell Fockis about content that breaks the Community Guidelines.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Open the menu on the post, or on the person's profile.",
          "Choose Report and pick the reason that fits best.",
          "Add details if they help, then send the report."
        ],
        "imageUrl": ""
      },
      {
        "heading": "",
        "text": "The person you report is not told who reported them. You can follow your reports and any decisions on My Moderation.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "My reports & decisions",
        "to": "/moderation"
      },
      {
        "label": "Community Guidelines",
        "to": "/community-guidelines"
      }
    ],
    "keywords": [
      "report",
      "post",
      "comment",
      "abuse",
      "harassment",
      "spam",
      "fake account"
    ],
    "order": 7,
    "featured": false
  },
  {
    "slug": "friends-followers",
    "kind": "article",
    "topic": "profile",
    "title": "Manage friends and requests",
    "summary": "Accept requests, find people you may know and remove friends.",
    "body": [
      {
        "heading": "",
        "text": "Friends shows your friends, incoming requests, requests you've sent and suggestions.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Friends",
        "to": "/friends"
      },
      {
        "label": "Friend requests",
        "to": "/friends/requests"
      },
      {
        "label": "Suggestions",
        "to": "/friends/suggestions"
      }
    ],
    "keywords": [
      "friends",
      "followers",
      "requests",
      "follow",
      "unfriend"
    ],
    "order": 8,
    "featured": false
  },
  {
    "slug": "messages-basics",
    "kind": "article",
    "topic": "messages",
    "title": "Send and manage messages",
    "summary": "Chat with friends in Fockis Messages.",
    "body": [
      {
        "heading": "",
        "text": "Open Messages from the sidebar or the message icon in the top bar to start or continue a conversation.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Messages",
        "to": "/messages"
      }
    ],
    "keywords": [
      "messages",
      "chat",
      "inbox",
      "dm",
      "conversation"
    ],
    "order": 9,
    "featured": false
  },
  {
    "slug": "block-someone",
    "kind": "article",
    "topic": "messages",
    "title": "Block someone",
    "summary": "Stop someone from contacting you, and see who you've blocked.",
    "body": [
      {
        "heading": "",
        "text": "You can block a person from their profile. Everyone you've blocked is listed in Friends → Blocked, where you can also unblock them.",
        "steps": [],
        "imageUrl": ""
      },
      {
        "heading": "",
        "text": "If someone is threatening or harassing you, report them as well as blocking them.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Blocked people",
        "to": "/friends/blocked"
      },
      {
        "label": "Safety & Security",
        "to": "/help/safety"
      }
    ],
    "keywords": [
      "block",
      "unblock",
      "blocked",
      "harassment",
      "stop messages"
    ],
    "order": 10,
    "featured": false
  },
  {
    "slug": "notifications",
    "kind": "article",
    "topic": "messages",
    "title": "Notifications",
    "summary": "Where to find your notifications.",
    "body": [
      {
        "heading": "",
        "text": "Select the bell in the top bar to see your latest notifications, including replies from Fockis Support.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [],
    "keywords": [
      "notifications",
      "bell",
      "alerts"
    ],
    "order": 11,
    "featured": false
  },
  {
    "slug": "go-live",
    "kind": "article",
    "topic": "waves",
    "title": "Go live on Fockis",
    "summary": "Start a live stream from Live Studio.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Open Live Studio.",
          "Set up your stream details.",
          "Start the stream when you're ready. Manage past and scheduled streams in Live Manager."
        ],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Live Studio",
        "to": "/live/studio"
      },
      {
        "label": "Live Manager",
        "to": "/live/manager"
      }
    ],
    "keywords": [
      "live",
      "stream",
      "broadcast",
      "go live",
      "studio"
    ],
    "order": 12,
    "featured": false
  },
  {
    "slug": "waves",
    "kind": "article",
    "topic": "waves",
    "title": "Watch and share Waves",
    "summary": "Short videos on Fockis.",
    "body": [
      {
        "heading": "",
        "text": "Open Waves from the sidebar to watch short videos. Report any Wave that breaks the Community Guidelines.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Waves",
        "to": "/waves"
      }
    ],
    "keywords": [
      "waves",
      "video",
      "upload",
      "reels",
      "shorts"
    ],
    "order": 13,
    "featured": false
  },
  {
    "slug": "gifts-coins",
    "kind": "article",
    "topic": "waves",
    "title": "Gifts and coins",
    "summary": "Buy coins, send gifts and see your gift history.",
    "body": [
      {
        "heading": "",
        "text": "Gifts are bought with coins from your Fockis wallet. You can see gifts you've sent and received in your gift history. Creators can follow their earnings and cash out from Earnings.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Buy coins",
        "to": "/wallet/buy-coins"
      },
      {
        "label": "Gift history",
        "to": "/gifts/history"
      },
      {
        "label": "Earnings",
        "to": "/earnings"
      }
    ],
    "keywords": [
      "gifts",
      "coins",
      "wallet",
      "earnings",
      "cash out",
      "creator"
    ],
    "order": 14,
    "featured": false
  },
  {
    "slug": "page-not-loading",
    "kind": "article",
    "topic": "technical",
    "title": "A page won't load or looks broken",
    "summary": "Quick fixes to try before reporting a problem.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Refresh the page.",
          "Check your internet connection, then check System Status below to see whether Fockis is reachable.",
          "Sign out and back in.",
          "Try another browser, or clear this site's cache and cookies.",
          "Still broken? Report a Problem and include the page address — we add your browser and device automatically."
        ],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "System Status",
        "to": "/help/status"
      },
      {
        "label": "Report a Problem",
        "to": "/help/report-problem"
      }
    ],
    "keywords": [
      "loading",
      "blank",
      "error",
      "broken",
      "crash",
      "slow",
      "bug"
    ],
    "order": 15,
    "featured": false
  },
  {
    "slug": "upload-failed",
    "kind": "article",
    "topic": "technical",
    "title": "Uploads fail or stop part-way",
    "summary": "What to check when a photo or video won't upload.",
    "body": [
      {
        "heading": "",
        "text": "Large files need a steady connection. Try again on Wi-Fi, keep the page open until the upload finishes, and make sure the file is a common image or video format.",
        "steps": [],
        "imageUrl": ""
      },
      {
        "heading": "",
        "text": "If it keeps failing, report a problem with the file type and size.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Report a Problem",
        "to": "/help/report-problem?topic=technical"
      }
    ],
    "keywords": [
      "upload",
      "video",
      "photo",
      "file",
      "failed"
    ],
    "order": 16,
    "featured": false
  },
  {
    "slug": "track-order",
    "kind": "article",
    "topic": "shop",
    "title": "Find and track your orders",
    "summary": "See your Fockis Shop orders and their status.",
    "body": [
      {
        "heading": "",
        "text": "Your orders and their details are in Orders. Open an order to see its items and status.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "My orders",
        "to": "/shop/orders"
      },
      {
        "label": "Fockis Shop",
        "to": "/shop"
      }
    ],
    "keywords": [
      "order",
      "track",
      "delivery",
      "status",
      "purchase"
    ],
    "order": 17,
    "featured": false
  },
  {
    "slug": "shop-returns",
    "kind": "article",
    "topic": "shop",
    "title": "Returns and refunds",
    "summary": "How to ask for a return or refund on a Fockis Shop order.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Open the order in Orders and note the order number.",
          "Contact Support, choose “Fockis Shop” and include the order number, the item, and what went wrong.",
          "Add photos of damaged or wrong items if you have them."
        ],
        "imageUrl": ""
      },
      {
        "heading": "",
        "text": "Support will reply on your ticket with next steps. Refunds go back to the original payment method.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "My orders",
        "to": "/shop/orders"
      },
      {
        "label": "Contact Support",
        "to": "/help/contact?topic=shop"
      }
    ],
    "keywords": [
      "return",
      "refund",
      "damaged",
      "wrong item",
      "money back"
    ],
    "order": 18,
    "featured": false
  },
  {
    "slug": "shop-shipping",
    "kind": "article",
    "topic": "shop",
    "title": "Shipping and delivery",
    "summary": "What to do if an order is late or hasn't arrived.",
    "body": [
      {
        "heading": "",
        "text": "Check the order's status in Orders first. If it's late or marked delivered but you don't have it, contact Support with the order number.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "My orders",
        "to": "/shop/orders"
      },
      {
        "label": "Contact Support",
        "to": "/help/contact?topic=shop"
      }
    ],
    "keywords": [
      "shipping",
      "delivery",
      "late",
      "not arrived",
      "lost"
    ],
    "order": 19,
    "featured": false
  },
  {
    "slug": "sell-on-shop",
    "kind": "article",
    "topic": "shop",
    "title": "Sell on Fockis Shop",
    "summary": "Open a store and list products.",
    "body": [
      {
        "heading": "",
        "text": "Start selling from Sell on Fockis Shop. Products must follow the Shop & Advertising Policy.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Sell on Fockis Shop",
        "to": "/shop/sell"
      },
      {
        "label": "Seller Center",
        "to": "/seller"
      },
      {
        "label": "Shop & Advertising Policy",
        "to": "/shop-advertising"
      }
    ],
    "keywords": [
      "sell",
      "seller",
      "store",
      "products",
      "listing"
    ],
    "order": 20,
    "featured": false
  },
  {
    "slug": "privacy-data",
    "kind": "article",
    "topic": "privacy",
    "title": "How Fockis uses your data",
    "summary": "Read the Privacy Policy and Terms.",
    "body": [
      {
        "heading": "",
        "text": "The Privacy Policy explains what Fockis collects and why. The Terms explain the rules for using Fockis.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Privacy Policy",
        "to": "/privacy"
      },
      {
        "label": "Terms",
        "to": "/terms"
      }
    ],
    "keywords": [
      "privacy",
      "data",
      "gdpr",
      "personal information"
    ],
    "order": 21,
    "featured": false
  },
  {
    "slug": "moderation-appeals",
    "kind": "article",
    "topic": "privacy",
    "title": "Moderation decisions and appeals",
    "summary": "See actions taken on your account or posts and appeal them.",
    "body": [
      {
        "heading": "",
        "text": "If Fockis removed your content or restricted your account, the decision and reason appear on My Moderation. You can appeal a decision there if you think it was a mistake.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "My Moderation",
        "to": "/moderation"
      }
    ],
    "keywords": [
      "appeal",
      "removed",
      "suspended",
      "restricted",
      "banned",
      "warning"
    ],
    "order": 22,
    "featured": false
  },
  {
    "slug": "child-safety",
    "kind": "article",
    "topic": "privacy",
    "title": "Child safety",
    "summary": "How Fockis protects young people, and how to report a concern.",
    "body": [
      {
        "heading": "",
        "text": "Read the Child Safety standards. If a child is in immediate danger, contact your local emergency services first, then report the content or account on Fockis.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Child Safety",
        "to": "/child-safety"
      }
    ],
    "keywords": [
      "child",
      "minor",
      "underage",
      "safety",
      "exploitation"
    ],
    "order": 23,
    "featured": false
  },
  {
    "slug": "manage-subscription",
    "kind": "article",
    "topic": "payments",
    "title": "Manage or cancel a subscription",
    "summary": "Change your plan, see billing, or cancel.",
    "body": [
      {
        "heading": "",
        "text": "Subscriptions shows your current plan. Billing lists your payments. You can cancel from the cancel page; payments are processed securely by Stripe.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Subscriptions",
        "to": "/subscriptions"
      },
      {
        "label": "Billing",
        "to": "/subscriptions/billing"
      },
      {
        "label": "Cancel subscription",
        "to": "/subscriptions/cancel"
      },
      {
        "label": "Plans",
        "to": "/subscriptions/plans"
      }
    ],
    "keywords": [
      "subscription",
      "plan",
      "upgrade",
      "cancel",
      "billing",
      "stripe",
      "premium"
    ],
    "order": 24,
    "featured": false
  },
  {
    "slug": "payment-problem",
    "kind": "article",
    "topic": "payments",
    "title": "A payment failed or I was charged twice",
    "summary": "What to do about a payment problem.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Check Payments and Billing to see the charge.",
          "If a card payment failed, check the card details and try again.",
          "If you were charged twice or for something you didn't buy, contact Support under “Payments & Subscriptions” with the date and amount. Never send your full card number."
        ],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Payments",
        "to": "/payments"
      },
      {
        "label": "Billing",
        "to": "/subscriptions/billing"
      },
      {
        "label": "Contact Support",
        "to": "/help/contact?topic=payments"
      }
    ],
    "keywords": [
      "charged",
      "payment",
      "failed",
      "card",
      "double",
      "refund",
      "stripe"
    ],
    "order": 25,
    "featured": false
  },
  {
    "slug": "wallet-cash-out",
    "kind": "article",
    "topic": "payments",
    "title": "Wallet and cash out",
    "summary": "Your Fockis wallet balance and creator payouts.",
    "body": [
      {
        "heading": "",
        "text": "Your wallet shows your coin balance. Creators can request a payout from Cash Out once they have earnings.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Wallet",
        "to": "/wallet"
      },
      {
        "label": "Cash out",
        "to": "/earnings/cash-out"
      }
    ],
    "keywords": [
      "wallet",
      "balance",
      "cash out",
      "payout",
      "withdraw"
    ],
    "order": 26,
    "featured": false
  },
  {
    "slug": "create-organization",
    "kind": "article",
    "topic": "organizations",
    "title": "Create an organization",
    "summary": "Set up a church, group or organization on Fockis.",
    "body": [
      {
        "heading": "",
        "text": "",
        "steps": [
          "Open Organizations.",
          "Choose to create a new organization and add its details.",
          "Invite members and manage it from the organization's admin area."
        ],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Organizations",
        "to": "/organizations"
      },
      {
        "label": "New organization",
        "to": "/organizations/new"
      }
    ],
    "keywords": [
      "organization",
      "church",
      "group",
      "create",
      "admin"
    ],
    "order": 27,
    "featured": false
  },
  {
    "slug": "organization-members",
    "kind": "article",
    "topic": "organizations",
    "title": "Member portal and events",
    "summary": "For members of an organization.",
    "body": [
      {
        "heading": "",
        "text": "Members can open their organization's member portal to see what's shared with them. Events you've joined are in Events → My RSVPs.",
        "steps": [],
        "imageUrl": ""
      }
    ],
    "links": [
      {
        "label": "Member portal",
        "to": "/organization/member-portal"
      },
      {
        "label": "Events",
        "to": "/events"
      },
      {
        "label": "My RSVPs",
        "to": "/events/my-rsvps"
      }
    ],
    "keywords": [
      "member",
      "portal",
      "events",
      "rsvp",
      "church"
    ],
    "order": 28,
    "featured": false
  },
  {
    "slug": "forgot-password",
    "kind": "faq",
    "topic": "account",
    "title": "I forgot my password. How do I get back in?",
    "summary": "Use “Forgot password” on the sign-in page and follow the link sent to your email.",
    "body": [],
    "links": [
      {
        "label": "Reset password",
        "to": "/forgot-password"
      }
    ],
    "keywords": [],
    "order": 0,
    "featured": false
  },
  {
    "slug": "change-email",
    "kind": "faq",
    "topic": "account",
    "title": "How do I change my email address?",
    "summary": "Go to Settings and start an email change. We send a code to the new address to confirm it's yours.",
    "body": [],
    "links": [
      {
        "label": "Settings",
        "to": "/settings"
      }
    ],
    "keywords": [],
    "order": 1,
    "featured": false
  },
  {
    "slug": "report-content",
    "kind": "faq",
    "topic": "privacy",
    "title": "How do I report a post or an account?",
    "summary": "Open the menu on the post or profile and choose Report. The person isn't told who reported them.",
    "body": [],
    "links": [
      {
        "label": "My reports",
        "to": "/moderation"
      }
    ],
    "keywords": [],
    "order": 2,
    "featured": false
  },
  {
    "slug": "appeal",
    "kind": "faq",
    "topic": "privacy",
    "title": "My post was removed. Can I appeal?",
    "summary": "Yes. Moderation decisions on your account or posts are listed on My Moderation, where you can appeal.",
    "body": [],
    "links": [
      {
        "label": "My Moderation",
        "to": "/moderation"
      }
    ],
    "keywords": [],
    "order": 3,
    "featured": false
  },
  {
    "slug": "block",
    "kind": "faq",
    "topic": "messages",
    "title": "How do I block someone?",
    "summary": "Block them from their profile. You can see and unblock people in Friends → Blocked.",
    "body": [],
    "links": [
      {
        "label": "Blocked people",
        "to": "/friends/blocked"
      }
    ],
    "keywords": [],
    "order": 4,
    "featured": false
  },
  {
    "slug": "cancel-subscription",
    "kind": "faq",
    "topic": "payments",
    "title": "How do I cancel my subscription?",
    "summary": "Open Subscriptions and use the cancel page. Your billing history stays available in Billing.",
    "body": [],
    "links": [
      {
        "label": "Cancel subscription",
        "to": "/subscriptions/cancel"
      }
    ],
    "keywords": [],
    "order": 5,
    "featured": false
  },
  {
    "slug": "charged-twice",
    "kind": "faq",
    "topic": "payments",
    "title": "I was charged twice. What should I do?",
    "summary": "Check Billing, then contact Support under Payments & Subscriptions with the date and amount. Never share your full card number.",
    "body": [],
    "links": [
      {
        "label": "Contact Support",
        "to": "/help/contact?topic=payments"
      }
    ],
    "keywords": [],
    "order": 6,
    "featured": false
  },
  {
    "slug": "order-status",
    "kind": "faq",
    "topic": "shop",
    "title": "Where can I see my Fockis Shop order?",
    "summary": "All your Shop orders are in Orders. Open one to see its items and status.",
    "body": [],
    "links": [
      {
        "label": "My orders",
        "to": "/shop/orders"
      }
    ],
    "keywords": [],
    "order": 7,
    "featured": false
  },
  {
    "slug": "refund",
    "kind": "faq",
    "topic": "shop",
    "title": "How do I return an item or get a refund?",
    "summary": "Contact Support under Fockis Shop with your order number and what went wrong. Support replies on your ticket with next steps.",
    "body": [],
    "links": [
      {
        "label": "Returns and refunds",
        "to": "/help/articles/shop-returns"
      }
    ],
    "keywords": [],
    "order": 8,
    "featured": false
  },
  {
    "slug": "coins",
    "kind": "faq",
    "topic": "waves",
    "title": "How do I buy coins to send gifts?",
    "summary": "Buy coins from your wallet. Gifts you send and receive are listed in your gift history.",
    "body": [],
    "links": [
      {
        "label": "Buy coins",
        "to": "/wallet/buy-coins"
      }
    ],
    "keywords": [],
    "order": 10,
    "featured": false
  },
  {
    "slug": "page-broken",
    "kind": "faq",
    "topic": "technical",
    "title": "A page is blank or keeps loading. What can I do?",
    "summary": "Refresh, check System Status, then sign out and back in. If it still fails, Report a Problem — we include your browser and device automatically.",
    "body": [],
    "links": [
      {
        "label": "Report a Problem",
        "to": "/help/report-problem"
      }
    ],
    "keywords": [],
    "order": 11,
    "featured": false
  },
  {
    "slug": "ticket-reply",
    "kind": "faq",
    "topic": "technical",
    "title": "How will I know when Support replies?",
    "summary": "You get a Fockis notification, and the reply appears in My Support Tickets.",
    "body": [],
    "links": [
      {
        "label": "My Support Tickets",
        "to": "/help/tickets"
      }
    ],
    "keywords": [],
    "order": 12,
    "featured": false
  },
  {
    "slug": "create-org",
    "kind": "faq",
    "topic": "organizations",
    "title": "How do I create a church or organization?",
    "summary": "Open Organizations and create a new one. You can then invite members and manage it from its admin area.",
    "body": [],
    "links": [
      {
        "label": "New organization",
        "to": "/organizations/new"
      }
    ],
    "keywords": [],
    "order": 13,
    "featured": false
  },
  {
    "slug": "sell",
    "kind": "faq",
    "topic": "marketplace",
    "title": "Can I sell on Fockis?",
    "summary": "Yes. Open a store from Sell on Fockis Shop, or create a business page. Listings must follow the Shop & Advertising Policy.",
    "body": [],
    "links": [
      {
        "label": "Sell on Fockis Shop",
        "to": "/shop/sell"
      }
    ],
    "keywords": [],
    "order": 14,
    "featured": false
  },
  {
    "slug": "friends",
    "kind": "faq",
    "topic": "profile",
    "title": "Where are my friend requests?",
    "summary": "In Friends → Requests. Requests you've sent are under Sent.",
    "body": [],
    "links": [
      {
        "label": "Friend requests",
        "to": "/friends/requests"
      }
    ],
    "keywords": [],
    "order": 15,
    "featured": false
  }
]
;
