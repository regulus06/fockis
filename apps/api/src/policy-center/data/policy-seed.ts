/* Initial policy content (from the original web/src/pages/legal pages).
   Seeded once into the database; after that the Admin Center is the source of truth.
   The five newer policies are seeded as drafts for legal review before publishing. */

export interface PolicySeed {
  slug: string;
  legacySlugs: string[];
  title: string;
  category: string;
  description: string;
  requiredAcceptance: boolean;
  effectiveDate: string | null;
  status: "published" | "draft";
  order: number;
  sections: { heading: string; body: string }[];
}

export const POLICY_SEED: PolicySeed[] = [
  {
    "slug": "privacy",
    "legacySlugs": [],
    "title": "Privacy Policy",
    "category": "privacy",
    "description": "How Fockis collects, uses, shares and protects your information.",
    "requiredAcceptance": true,
    "effectiveDate": "2026-10-17",
    "status": "published",
    "order": 0,
    "sections": [
      {
        "heading": "1. Information We Collect",
        "body": "Fockis may collect information you provide when creating an account, updating your profile, publishing content, communicating with other users, or using platform features.\n- Account information, such as your name, email address, and phone number.\n- Content you upload, including posts, photos, videos, comments, and profile information.\n- Technical information, such as device details, log information, and usage activity."
      },
      {
        "heading": "2. How We Use Information",
        "body": "We use information to operate and improve Fockis, personalize experiences, provide communications, protect accounts, prevent abuse, process transactions, and comply with applicable laws."
      },
      {
        "heading": "3. Sharing Information",
        "body": "Information may be shared with service providers supporting hosting, payments, communications, and security. Information may also be disclosed when required by law or necessary to protect users and the service."
      },
      {
        "heading": "4. Your Privacy Choices",
        "body": "Depending on applicable law, you may have rights to access, correct, delete, or obtain a copy of certain personal information. You may also manage available account privacy settings."
      },
      {
        "heading": "5. Contact",
        "body": "For privacy questions, contact info@fockis.com."
      }
    ]
  },
  {
    "slug": "terms",
    "legacySlugs": [],
    "title": "Terms of Service",
    "category": "legal",
    "description": "The rules for using Fockis and our services.",
    "requiredAcceptance": true,
    "effectiveDate": "2026-10-17",
    "status": "published",
    "order": 1,
    "sections": [
      {
        "heading": "1. Using Fockis",
        "body": "By using Fockis, you agree to follow these terms and applicable laws. You are responsible for activity conducted through your account."
      },
      {
        "heading": "2. Eligibility and Accounts",
        "body": "Standard Fockis accounts are intended for people aged 13 or older, subject to applicable law and higher age limits for certain features. Keep your account information accurate and protect your login credentials."
      },
      {
        "heading": "3. Content and Conduct",
        "body": "You must have the necessary rights to content you publish. Fraud, harassment, exploitation, unlawful activity, and other prohibited conduct are not permitted."
      },
      {
        "heading": "4. Purchases and Subscriptions",
        "body": "Review prices, renewal terms, cancellation instructions, and purchase conditions before completing transactions. Mandatory consumer rights remain unaffected."
      },
      {
        "heading": "5. Contact",
        "body": "For questions about these terms, contact info@fockis.com."
      }
    ]
  },
  {
    "slug": "community-guidelines",
    "legacySlugs": [],
    "title": "Community Guidelines",
    "category": "community",
    "description": "What's allowed on Fockis and what is not.",
    "requiredAcceptance": true,
    "effectiveDate": "2026-10-17",
    "status": "published",
    "order": 2,
    "sections": [
      {
        "heading": "1. Respectful Participation",
        "body": "Treat other users respectfully. Share authentic content and respect privacy, intellectual property, and applicable laws."
      },
      {
        "heading": "2. Prohibited Content",
        "body": "- Child sexual exploitation, grooming, or content that endangers children.\n- Credible threats, targeted harassment, stalking, or non-consensual intimate imagery.\n- Fraud, scams, impersonation, malicious links, and fake engagement.\n- Illegal goods, unlawful activity, and intellectual property infringement."
      },
      {
        "heading": "3. Reporting and Enforcement",
        "body": "Use available reporting and blocking controls to address safety concerns. Fockis may remove content or restrict accounts when appropriate under its policies and applicable law."
      },
      {
        "heading": "4. Contact",
        "body": "For community safety concerns, contact info@fockis.com."
      }
    ]
  },
  {
    "slug": "child-safety",
    "legacySlugs": [],
    "title": "Child Safety Policy",
    "category": "security",
    "description": "How Fockis protects young people and responds to child-safety concerns.",
    "requiredAcceptance": true,
    "effectiveDate": "2026-10-17",
    "status": "published",
    "order": 3,
    "sections": [
      {
        "heading": "1. Commitment to Child Safety",
        "body": "Fockis prohibits child sexual abuse material, grooming, sexual exploitation of minors, and other conduct that endangers children."
      },
      {
        "heading": "2. Reporting Concerns",
        "body": "Report suspected child exploitation through available in-app reporting tools or by contacting info@fockis.com."
      },
      {
        "heading": "3. Enforcement",
        "body": "Fockis may remove content, restrict accounts, preserve relevant information, and report suspected illegal activity to appropriate authorities where required or appropriate."
      },
      {
        "heading": "4. Age Restrictions",
        "body": "Standard accounts are intended for users aged 13 or older, subject to applicable legal requirements and higher age restrictions for certain features."
      },
      {
        "heading": "5. Contact",
        "body": "Child safety contact: info@fockis.com or (740) 729-0687."
      }
    ]
  },
  {
    "slug": "payments",
    "legacySlugs": [],
    "title": "Payments, Subscriptions, and Refund Policy",
    "category": "payments",
    "description": "Billing, subscriptions, refunds and payouts.",
    "requiredAcceptance": true,
    "effectiveDate": "2026-10-17",
    "status": "published",
    "order": 4,
    "sections": [
      {
        "heading": "1. Purchases",
        "body": "Review the displayed price, currency, billing period, renewal terms, and applicable restrictions before making a purchase."
      },
      {
        "heading": "2. Subscriptions and Cancellations",
        "body": "Subscriptions may renew automatically. Follow the cancellation instructions provided by the billing provider. Deleting the app does not necessarily cancel a subscription."
      },
      {
        "heading": "3. Refunds",
        "body": "Refund eligibility depends on applicable law, purchase terms, and payment provider policies. Mandatory consumer rights remain unaffected."
      },
      {
        "heading": "4. Contact",
        "body": "For payment questions, contact info@fockis.com."
      }
    ]
  },
  {
    "slug": "copyright",
    "legacySlugs": [],
    "title": "Copyright and Intellectual Property Policy",
    "category": "copyright",
    "description": "Copyright complaints, takedowns and intellectual property.",
    "requiredAcceptance": true,
    "effectiveDate": "2026-10-17",
    "status": "published",
    "order": 5,
    "sections": [
      {
        "heading": "1. Respect Intellectual Property",
        "body": "Do not upload, distribute, or sell content unless you own it, have permission, or have another lawful basis to use it."
      },
      {
        "heading": "2. Reporting Infringement",
        "body": "Send copyright or intellectual property concerns to info@fockis.com with sufficient information to identify the material and explain the concern."
      },
      {
        "heading": "3. Enforcement",
        "body": "Fockis may remove reported material or restrict accounts when appropriate under applicable law and platform policies."
      }
    ]
  },
  {
    "slug": "fockis-shop",
    "legacySlugs": [
      "shop-advertising"
    ],
    "title": "Fockis Shop Policy",
    "category": "fockis_shop",
    "description": "Orders, returns, refunds, seller and advertising rules.",
    "requiredAcceptance": true,
    "effectiveDate": "2026-10-17",
    "status": "published",
    "order": 6,
    "sections": [
      {
        "heading": "1. Accurate Listings",
        "body": "Sellers must provide accurate descriptions, lawful products, and appropriate disclosures. Counterfeit, stolen, and prohibited goods are not allowed."
      },
      {
        "heading": "2. Advertising",
        "body": "Advertisements must not contain scams, deceptive claims, malicious links, or prohibited content. Sponsored content must be disclosed when required."
      },
      {
        "heading": "3. Contact",
        "body": "For shop and advertising questions, contact info@fockis.com."
      }
    ]
  },
  {
    "slug": "cookie-policy",
    "legacySlugs": [],
    "title": "Cookie Policy",
    "category": "privacy",
    "description": "How Fockis uses cookies and similar technologies, and how to control them.",
    "requiredAcceptance": false,
    "effectiveDate": null,
    "status": "draft",
    "order": 7,
    "sections": [
      {
        "heading": "1. What cookies are",
        "body": "Cookies are small files stored on your device. Similar technologies include local storage and pixels."
      },
      {
        "heading": "2. Cookies we use",
        "body": "- Essential cookies keep you signed in, protect your account and make Fockis work. They can't be switched off.\n- Analytics cookies help us understand how Fockis is used.\n- Personalization cookies remember your preferences.\n- Advertising cookies, where used, help show relevant ads."
      },
      {
        "heading": "3. Your choices",
        "body": "You can change optional cookies at any time in Policy, Privacy & Safety → Consent. Withdrawing consent doesn't affect processing that happened before."
      }
    ]
  },
  {
    "slug": "safety-policy",
    "legacySlugs": [],
    "title": "Safety Policy",
    "category": "security",
    "description": "How to report abuse, scams and policy violations, and how Fockis responds.",
    "requiredAcceptance": false,
    "effectiveDate": null,
    "status": "draft",
    "order": 8,
    "sections": [
      {
        "heading": "1. Reporting",
        "body": "You can report posts, accounts, messages, harassment, scams, impersonation and harmful content from the item itself or from the Safety Center."
      },
      {
        "heading": "2. What happens next",
        "body": "Reports are reviewed by the Fockis safety team. A report on its own doesn't remove content; trained staff decide using our policies."
      },
      {
        "heading": "3. Staying safe",
        "body": "- Turn on two-factor authentication.\n- Never share your password or verification codes.\n- Block or mute accounts you don't want to hear from."
      }
    ]
  },
  {
    "slug": "data-retention-policy",
    "legacySlugs": [],
    "title": "Data Retention Policy",
    "category": "data_retention",
    "description": "How long Fockis keeps different kinds of records and when they are deleted.",
    "requiredAcceptance": false,
    "effectiveDate": null,
    "status": "draft",
    "order": 9,
    "sections": [
      {
        "heading": "1. Our approach",
        "body": "We keep personal information only as long as needed for the purpose it was collected for, or as required or permitted by law."
      },
      {
        "heading": "2. After you delete your account",
        "body": "Your profile and eligible personal information are removed from Fockis. Certain financial, security, fraud-prevention and legal records may be retained when required or permitted by applicable law. Retained information is restricted, protected and deleted when it is no longer needed. Backup copies may remain temporarily until the backup retention cycle expires."
      },
      {
        "heading": "3. Retention periods",
        "body": "Retention periods differ by record type and jurisdiction and are reviewed by our compliance team."
      }
    ]
  },
  {
    "slug": "user-content-policy",
    "legacySlugs": [],
    "title": "User Content Policy",
    "category": "community",
    "description": "Your rights and responsibilities for what you post on Fockis.",
    "requiredAcceptance": false,
    "effectiveDate": null,
    "status": "draft",
    "order": 10,
    "sections": [
      {
        "heading": "1. Your content",
        "body": "You own the content you post. You give Fockis permission to host, display and distribute it to operate the service."
      },
      {
        "heading": "2. Responsibilities",
        "body": "Only post content you have the right to share, and follow the Community Guidelines."
      }
    ]
  },
  {
    "slug": "account-suspension-appeals",
    "legacySlugs": [],
    "title": "Account Suspension and Appeals Policy",
    "category": "moderation",
    "description": "How restrictions and suspensions work, and how to appeal a decision.",
    "requiredAcceptance": false,
    "effectiveDate": null,
    "status": "draft",
    "order": 11,
    "sections": [
      {
        "heading": "1. Restrictions",
        "body": "Fockis may warn, restrict or suspend accounts that break our policies. You'll be told which rule applied."
      },
      {
        "heading": "2. Appeals",
        "body": "You can appeal a decision from Policy, Privacy & Safety → Appeals. A different reviewer looks at your appeal and you'll be told the outcome."
      }
    ]
  }
];
