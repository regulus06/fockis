export type LegalPolicyBlock = {
  kind: "paragraph" | "bullet" | "number";
  text: string;
};

export type LegalPolicySection = {
  heading: string;
  paragraphs: LegalPolicyBlock[];
};

export type LegalPolicy = {
  slug: string;
  title: string;
  effectiveDate: string;
  items: LegalPolicySection[];
};

const legalPolicies: LegalPolicy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    effectiveDate: "October 17, 2026",
    items: [
      {
        heading: "1. Information We Collect",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Fockis may collect information you provide when creating an account, updating your profile, publishing content, communicating with other users, or using platform features.",
          },
          {
            kind: "bullet",
            text: "Account information, such as your name, email address, and phone number.",
          },
          {
            kind: "bullet",
            text: "Content you upload, including posts, photos, videos, comments, and profile information.",
          },
          {
            kind: "bullet",
            text: "Technical information, such as device details, log information, and usage activity.",
          },
        ],
      },
      {
        heading: "2. How We Use Information",
        paragraphs: [
          {
            kind: "paragraph",
            text: "We use information to operate and improve Fockis, personalize experiences, provide communications, protect accounts, prevent abuse, process transactions, and comply with applicable laws.",
          },
        ],
      },
      {
        heading: "3. Sharing Information",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Information may be shared with service providers supporting hosting, payments, communications, and security. Information may also be disclosed when required by law or necessary to protect users and the service.",
          },
        ],
      },
      {
        heading: "4. Your Privacy Choices",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Depending on applicable law, you may have rights to access, correct, delete, or obtain a copy of certain personal information. You may also manage available account privacy settings.",
          },
        ],
      },
      {
        heading: "5. Contact",
        paragraphs: [
          {
            kind: "paragraph",
            text: "For privacy questions, contact info@fockis.com.",
          },
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    effectiveDate: "October 17, 2026",
    items: [
      {
        heading: "1. Using Fockis",
        paragraphs: [
          {
            kind: "paragraph",
            text: "By using Fockis, you agree to follow these terms and applicable laws. You are responsible for activity conducted through your account.",
          },
        ],
      },
      {
        heading: "2. Eligibility and Accounts",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Standard Fockis accounts are intended for people aged 13 or older, subject to applicable law and higher age limits for certain features. Keep your account information accurate and protect your login credentials.",
          },
        ],
      },
      {
        heading: "3. Content and Conduct",
        paragraphs: [
          {
            kind: "paragraph",
            text: "You must have the necessary rights to content you publish. Fraud, harassment, exploitation, unlawful activity, and other prohibited conduct are not permitted.",
          },
        ],
      },
      {
        heading: "4. Purchases and Subscriptions",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Review prices, renewal terms, cancellation instructions, and purchase conditions before completing transactions. Mandatory consumer rights remain unaffected.",
          },
        ],
      },
      {
        heading: "5. Contact",
        paragraphs: [
          {
            kind: "paragraph",
            text: "For questions about these terms, contact info@fockis.com.",
          },
        ],
      },
    ],
  },
  {
    slug: "community-guidelines",
    title: "Community Guidelines",
    effectiveDate: "October 17, 2026",
    items: [
      {
        heading: "1. Respectful Participation",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Treat other users respectfully. Share authentic content and respect privacy, intellectual property, and applicable laws.",
          },
        ],
      },
      {
        heading: "2. Prohibited Content",
        paragraphs: [
          {
            kind: "bullet",
            text: "Child sexual exploitation, grooming, or content that endangers children.",
          },
          {
            kind: "bullet",
            text: "Credible threats, targeted harassment, stalking, or non-consensual intimate imagery.",
          },
          {
            kind: "bullet",
            text: "Fraud, scams, impersonation, malicious links, and fake engagement.",
          },
          {
            kind: "bullet",
            text: "Illegal goods, unlawful activity, and intellectual property infringement.",
          },
        ],
      },
      {
        heading: "3. Reporting and Enforcement",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Use available reporting and blocking controls to address safety concerns. Fockis may remove content or restrict accounts when appropriate under its policies and applicable law.",
          },
        ],
      },
      {
        heading: "4. Contact",
        paragraphs: [
          {
            kind: "paragraph",
            text: "For community safety concerns, contact info@fockis.com.",
          },
        ],
      },
    ],
  },
  {
    slug: "child-safety",
    title: "Child Safety Policy",
    effectiveDate: "October 17, 2026",
    items: [
      {
        heading: "1. Commitment to Child Safety",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Fockis prohibits child sexual abuse material, grooming, sexual exploitation of minors, and other conduct that endangers children.",
          },
        ],
      },
      {
        heading: "2. Reporting Concerns",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Report suspected child exploitation through available in-app reporting tools or by contacting info@fockis.com.",
          },
        ],
      },
      {
        heading: "3. Enforcement",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Fockis may remove content, restrict accounts, preserve relevant information, and report suspected illegal activity to appropriate authorities where required or appropriate.",
          },
        ],
      },
      {
        heading: "4. Age Restrictions",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Standard accounts are intended for users aged 13 or older, subject to applicable legal requirements and higher age restrictions for certain features.",
          },
        ],
      },
      {
        heading: "5. Contact",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Child safety contact: info@fockis.com or (740) 729-0687.",
          },
        ],
      },
    ],
  },
  {
    slug: "payments",
    title: "Payments, Subscriptions, and Refund Policy",
    effectiveDate: "October 17, 2026",
    items: [
      {
        heading: "1. Purchases",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Review the displayed price, currency, billing period, renewal terms, and applicable restrictions before making a purchase.",
          },
        ],
      },
      {
        heading: "2. Subscriptions and Cancellations",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Subscriptions may renew automatically. Follow the cancellation instructions provided by the billing provider. Deleting the app does not necessarily cancel a subscription.",
          },
        ],
      },
      {
        heading: "3. Refunds",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Refund eligibility depends on applicable law, purchase terms, and payment provider policies. Mandatory consumer rights remain unaffected.",
          },
        ],
      },
      {
        heading: "4. Contact",
        paragraphs: [
          {
            kind: "paragraph",
            text: "For payment questions, contact info@fockis.com.",
          },
        ],
      },
    ],
  },
  {
    slug: "copyright",
    title: "Copyright and Intellectual Property Policy",
    effectiveDate: "October 17, 2026",
    items: [
      {
        heading: "1. Respect Intellectual Property",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Do not upload, distribute, or sell content unless you own it, have permission, or have another lawful basis to use it.",
          },
        ],
      },
      {
        heading: "2. Reporting Infringement",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Send copyright or intellectual property concerns to info@fockis.com with sufficient information to identify the material and explain the concern.",
          },
        ],
      },
      {
        heading: "3. Enforcement",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Fockis may remove reported material or restrict accounts when appropriate under applicable law and platform policies.",
          },
        ],
      },
    ],
  },
  {
    slug: "shop-advertising",
    title: "Shop and Advertising Policy",
    effectiveDate: "October 17, 2026",
    items: [
      {
        heading: "1. Accurate Listings",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Sellers must provide accurate descriptions, lawful products, and appropriate disclosures. Counterfeit, stolen, and prohibited goods are not allowed.",
          },
        ],
      },
      {
        heading: "2. Advertising",
        paragraphs: [
          {
            kind: "paragraph",
            text: "Advertisements must not contain scams, deceptive claims, malicious links, or prohibited content. Sponsored content must be disclosed when required.",
          },
        ],
      },
      {
        heading: "3. Contact",
        paragraphs: [
          {
            kind: "paragraph",
            text: "For shop and advertising questions, contact info@fockis.com.",
          },
        ],
      },
    ],
  },
];

export default legalPolicies;