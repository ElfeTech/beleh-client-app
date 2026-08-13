export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  updated: string;
  summary: string;
  sections: LegalSection[];
};

export const LEGAL_UPDATED = '13 August 2026';

const COMPANY = 'Yulona';
const PRODUCT = 'Beleh (ብልህ)';
const SITE = 'https://beleh.ai';
const COMPANY_SITE = 'https://www.yulona.co';
const SUPPORT = 'hello@yulona.co';
const COMPANY_EMAIL = 'drop@yulona.co';

export const LEGAL_DOCS: LegalDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of Use',
    updated: LEGAL_UPDATED,
    summary: `These Terms of Use govern access to ${PRODUCT}, an AI business-intelligence product operated by ${COMPANY}.`,
    sections: [
      {
        heading: '1. Who we are',
        paragraphs: [
          `${PRODUCT} (“Beleh”, “the Service”) is provided by ${COMPANY}, a privately held technology company headquartered in Dubai, United Arab Emirates (${COMPANY_SITE}). Contact: ${SUPPORT} or ${COMPANY_EMAIL}.`,
          `By creating an account, inviting teammates, connecting data sources, or otherwise using ${SITE}, you agree to these Terms. If you use Beleh on behalf of an organization, you represent that you have authority to bind that organization.`,
        ],
      },
      {
        heading: '2. The service',
        paragraphs: [
          'Beleh lets you connect business data (file uploads such as CSV, Excel, and JSON, and database connectors such as PostgreSQL), ask questions in natural language, and receive analysis, tables, and charts. Features may include workspaces, members, usage metering, and paid subscription plans billed via Stripe.',
          'We may change, suspend, or discontinue features. We do not guarantee that any particular visualization, insight, or query result is complete, error-free, or suitable for a specific business decision. You remain responsible for validating outputs before relying on them.',
        ],
      },
      {
        heading: '3. Accounts and workspaces',
        paragraphs: [
          'You must provide accurate account information and keep credentials confidential. Workspace owners control billing, members, and data sources. Invited members must use Beleh only as permitted by the owner.',
          'You are responsible for activity under your account and for configuring access (roles, selected sources, and sharing) appropriately for your organization.',
        ],
      },
      {
        heading: '4. Customer data',
        paragraphs: [
          '“Customer Data” means data you or your members upload, connect, or query through Beleh (including files, database contents, schemas, prompts, and generated analyses stored in your workspace). You retain all rights in Customer Data.',
          'You grant Yulona a limited license to host, process, and display Customer Data solely to provide and secure the Service, including running queries, generating visualizations, and supporting your workspace. We do not claim ownership of your underlying business data.',
          'You represent that you have all rights and notices required to provide Customer Data to Beleh, including personal data of employees, customers, or other individuals that may appear in connected sources.',
        ],
      },
      {
        heading: '5. Acceptable use',
        paragraphs: [
          'You must not misuse Beleh. Prohibited conduct includes attempting to access other customers’ data, reverse engineering the Service except as allowed by law, overloading infrastructure, using the Service to violate law, or submitting unlawful, infringing, or harmful content. See also our Acceptable Use Policy.',
        ],
      },
      {
        heading: '6. Subscriptions, trials, and billing',
        paragraphs: [
          'Paid plans, usage limits, and trials are described in-product. Payments are processed by Stripe. Taxes may apply. Unless stated otherwise, fees are non-refundable except where required by law.',
          'If you exceed plan limits (workspaces, datasources, members, or credits), features may be restricted until you upgrade or usage resets. Failure to pay may result in suspension.',
        ],
      },
      {
        heading: '7. Intellectual property',
        paragraphs: [
          'Yulona and its licensors own Beleh, including software, branding, documentation, and the conversational analytics interface. Except for Customer Data and your feedback (which you grant us a royalty-free license to use to improve the Service), these Terms do not transfer IP rights to you.',
        ],
      },
      {
        heading: '8. Confidentiality and security',
        paragraphs: [
          'Each party will protect the other’s confidential information with reasonable care. We implement technical and organizational measures appropriate to a multi-tenant SaaS analytics product, including encrypted transport (TLS) and access controls. No method of transmission or storage is 100% secure.',
        ],
      },
      {
        heading: '9. Disclaimers and limitation of liability',
        paragraphs: [
          'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, YULONA DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. AI-GENERATED ANALYSIS MAY BE INCORRECT OR INCOMPLETE.',
          'TO THE MAXIMUM EXTENT PERMITTED BY LAW, YULONA’S TOTAL LIABILITY ARISING OUT OF THESE TERMS IS LIMITED TO THE AMOUNTS YOU PAID FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM, OR USD 100 IF YOU ARE ON A FREE PLAN. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR LOST-PROFIT DAMAGES.',
        ],
      },
      {
        heading: '10. Term and termination',
        paragraphs: [
          'You may stop using Beleh at any time. We may suspend or terminate access for breach, legal risk, or non-payment. Upon termination, we will delete or return Customer Data in accordance with our Privacy Policy and Data Processing Agreement, subject to legal retention requirements.',
        ],
      },
      {
        heading: '11. Governing law',
        paragraphs: [
          'These Terms are governed by the laws of the United Arab Emirates, without regard to conflict-of-law rules. Courts of Dubai have exclusive jurisdiction, except that either party may seek injunctive relief in any competent court.',
        ],
      },
      {
        heading: '12. Changes',
        paragraphs: [
          `We may update these Terms. Material changes will be posted in the product or on ${SITE}. Continued use after the effective date constitutes acceptance. Questions: ${SUPPORT}.`,
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: LEGAL_UPDATED,
    summary: `How ${COMPANY} collects, uses, and protects personal data when you use ${PRODUCT}.`,
    sections: [
      {
        heading: '1. Scope',
        paragraphs: [
          `This Privacy Policy explains how ${COMPANY} (“we”) processes personal data in connection with ${PRODUCT} (${SITE}). It covers account holders, invited workspace members, and visitors to our marketing site.`,
          'If we process Customer Data on your behalf as a processor (for example personal data inside a spreadsheet or database you connect), our Data Processing Agreement also applies.',
        ],
      },
      {
        heading: '2. Data we collect',
        paragraphs: ['We process the following categories of data:'],
        bullets: [
          'Account data: name, email, Google sign-in identifiers, profile photo if provided by your identity provider.',
          'Workspace data: workspace names, roles, invitations, selected datasources, and usage/quota meters.',
          'Customer Data: files, schemas, query text, and analysis artifacts you create in Beleh.',
          'Billing data: plan, subscription status, and Stripe customer/subscription identifiers. Card details are handled by Stripe, not stored by Yulona.',
          'Technical data: device/browser type, IP address, approximate location, logs, and cookies or similar technologies (see Cookie Policy).',
          'Support communications sent to hello@yulona.co or drop@yulona.co.',
        ],
      },
      {
        heading: '3. How we use data',
        paragraphs: ['We use personal data to:'],
        bullets: [
          'Provide, secure, and improve Beleh (authentication, workspaces, query execution, visualizations).',
          'Meter usage, enforce plan limits, and process subscriptions.',
          'Communicate about the Service, security notices, and (with consent where required) product updates.',
          'Comply with law and protect Yulona, customers, and the public.',
        ],
      },
      {
        heading: '4. Legal bases (GDPR / similar laws)',
        paragraphs: [
          'Where GDPR or equivalent law applies, we rely on: performance of a contract (providing the Service); legitimate interests (security, product improvement, B2B communications); consent (optional cookies or marketing where required); and legal obligation.',
        ],
      },
      {
        heading: '5. Sharing',
        paragraphs: [
          'We do not sell personal data. We share data with subprocessors that help us operate Beleh, including Firebase Authentication, cloud hosting/infrastructure, analytics (where enabled), and Stripe for payments. These parties may only process data under our instructions or as independent controllers for payment.',
          'We may disclose data if required by law or to protect rights, safety, or security.',
        ],
      },
      {
        heading: '6. International transfers',
        paragraphs: [
          'Yulona is based in the UAE. Customer and account data may be processed in regions where our infrastructure and subprocessors operate. Where required, we use appropriate safeguards (such as contractual clauses) for cross-border transfers.',
        ],
      },
      {
        heading: '7. Retention',
        paragraphs: [
          'We retain account and workspace data while your account is active. After deletion or contract end, we delete or anonymize personal data within a reasonable period unless longer retention is required by law or for dispute resolution. Backup copies may persist for a limited time.',
        ],
      },
      {
        heading: '8. Your rights',
        paragraphs: [
          `Depending on your location, you may have rights to access, correct, delete, restrict, or export personal data, and to object to certain processing. Account holders can update profile details in Settings. To exercise rights, email ${SUPPORT}. You may also lodge a complaint with a supervisory authority.`,
        ],
      },
      {
        heading: '9. Children',
        paragraphs: [
          'Beleh is a business product and is not directed to children under 16. We do not knowingly collect personal data from children.',
        ],
      },
      {
        heading: '10. Contact',
        paragraphs: [
          `Privacy inquiries: ${SUPPORT}. Company: Yulona, Amman Street, Dubai, UAE. Website: ${COMPANY_SITE}.`,
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    updated: LEGAL_UPDATED,
    summary: `How ${PRODUCT} uses cookies and similar technologies.`,
    sections: [
      {
        heading: '1. What cookies are',
        paragraphs: [
          'Cookies are small text files stored on your device. We also use local storage, session storage, and similar technologies to keep you signed in, remember preferences, and understand how the product is used.',
        ],
      },
      {
        heading: '2. Cookies we use',
        paragraphs: ['Beleh uses:'],
        bullets: [
          'Strictly necessary: authentication session, CSRF/security, workspace selection, and load balancing. These are required for the Service to function.',
          'Preferences: theme (light/dark/system), collapsed UI state, list search memory, and similar settings stored locally.',
          'Analytics (where enabled): tools such as Google Analytics or Microsoft Clarity to understand usage and improve the product. These may set first- or third-party cookies.',
        ],
      },
      {
        heading: '3. Duration',
        paragraphs: [
          'Session cookies expire when you close the browser. Persistent cookies and local storage remain until they expire, you clear them, or you sign out where applicable.',
        ],
      },
      {
        heading: '4. Your choices',
        paragraphs: [
          'You can control cookies through your browser settings. Blocking strictly necessary cookies will prevent sign-in and core features from working. Where required by law, we will request consent for non-essential analytics cookies.',
        ],
      },
      {
        heading: '5. Contact',
        paragraphs: [`Questions about cookies: ${SUPPORT}.`],
      },
    ],
  },
  {
    slug: 'dpa',
    title: 'Data Processing Agreement',
    updated: LEGAL_UPDATED,
    summary: `Processor terms for Customer Data that ${COMPANY} processes on behalf of workspace customers using ${PRODUCT}.`,
    sections: [
      {
        heading: '1. Roles',
        paragraphs: [
          `When you use Beleh to analyze data that includes personal data of your employees, customers, or other individuals, you are the controller (or a processor acting for your own customer) and ${COMPANY} is the processor.`,
          'This DPA forms part of the Terms of Use for paid and free workspace customers. If you require a signed copy for enterprise procurement, contact hello@yulona.co.',
        ],
      },
      {
        heading: '2. Subject matter and duration',
        paragraphs: [
          'Yulona processes Customer Data to provide conversational analytics: ingesting connected files and databases, executing queries, generating insights/charts, storing workspace artifacts, and providing support. Processing lasts for the term of your subscription or free use plus any deletion window described in the Privacy Policy.',
        ],
      },
      {
        heading: '3. Nature and purpose',
        paragraphs: [
          'Processing is automated hosting, transformation, indexing/preview, AI-assisted analysis, and display to authorized workspace users. Yulona will not use Customer Data to train general-purpose foundation models for unrelated customers. Aggregated, de-identified metrics about product usage (not your underlying tables) may be used to operate and improve Beleh.',
        ],
      },
      {
        heading: '4. Types of personal data and data subjects',
        paragraphs: [
          'Types depend on what you connect. They may include names, emails, identifiers, commercial records, and other fields present in your sources. Data subjects may include your staff, end customers, suppliers, or other individuals you choose to include. You determine the categories; Yulona does not independently collect those individuals’ data for your workspace.',
        ],
      },
      {
        heading: '5. Instructions and confidentiality',
        paragraphs: [
          'Yulona processes Customer Data only on documented instructions (including configuration in the product) unless required by law. Personnel with access are bound by confidentiality.',
        ],
      },
      {
        heading: '6. Security',
        paragraphs: [
          'Yulona maintains appropriate technical and organizational measures, including TLS in transit, access controls, workspace isolation, logging, and vendor due diligence. The landing site describes a SOC 2-ready architecture; current certification status may be requested from support.',
        ],
      },
      {
        heading: '7. Subprocessors',
        paragraphs: [
          'You authorize Yulona to engage subprocessors necessary to deliver Beleh (for example cloud hosting, authentication via Firebase, and payment via Stripe for account billing). Yulona remains responsible for subprocessors’ performance. A current list is available on request at hello@yulona.co.',
        ],
      },
      {
        heading: '8. International transfers',
        paragraphs: [
          'Where Customer Data is transferred outside the EEA/UK or other restricted regions, Yulona will ensure an appropriate transfer mechanism (such as standard contractual clauses) where required.',
        ],
      },
      {
        heading: '9. Assistance, breaches, and audits',
        paragraphs: [
          'Yulona will assist with reasonable data-subject requests, DPIAs, and security questionnaires proportionate to the Service. We will notify you without undue delay after becoming aware of a personal-data breach affecting your Customer Data. Audits may be satisfied by independent reports or questionnaires unless a more intrusive audit is required by law or a regulator.',
        ],
      },
      {
        heading: '10. Return and deletion',
        paragraphs: [
          'Upon termination, you may export available workspace artifacts where the product supports it. Yulona will delete Customer Data from production systems within 30 days after account/workspace deletion, except for legally required archives or residual backups that expire on a rolling schedule.',
        ],
      },
      {
        heading: '11. Liability',
        paragraphs: [
          'Liability under this DPA is subject to the limitations in the Terms of Use, except where prohibited by applicable data-protection law.',
        ],
      },
    ],
  },
  {
    slug: 'aup',
    title: 'Acceptable Use Policy',
    updated: LEGAL_UPDATED,
    summary: `Rules for using ${PRODUCT} safely and lawfully.`,
    sections: [
      {
        heading: '1. Purpose',
        paragraphs: [
          `This Acceptable Use Policy (“AUP”) applies to everyone who uses ${PRODUCT}. It sits alongside the Terms of Use. Violations may result in suspension or termination.`,
        ],
      },
      {
        heading: '2. You must not',
        paragraphs: ['You agree not to:'],
        bullets: [
          'Probe, scan, or attack Beleh infrastructure or other customers’ workspaces.',
          'Upload malware, or use connected databases in a way that harms third-party systems.',
          'Use Beleh to generate or distribute illegal content, spam, or deceptive analytics intended to defraud.',
          'Circumvent plan limits, authentication, or access controls.',
          'Resell or white-label the Service without a written agreement with Yulona.',
          'Submit prompts or data you are not authorized to process.',
          'Interfere with metering, billing, or usage reporting.',
        ],
      },
      {
        heading: '3. AI outputs',
        paragraphs: [
          'You must not present Beleh outputs as professional legal, medical, or financial advice. Review charts and figures before sharing them externally. Do not use the Service to attempt to re-identify individuals from anonymized datasets you do not control.',
        ],
      },
      {
        heading: '4. Reporting',
        paragraphs: [`Report abuse or security issues to ${SUPPORT}.`],
      },
    ],
  },
];

export const LEGAL_SLUGS = LEGAL_DOCS.map((d) => d.slug);

export function getLegalDocument(slug: string | null | undefined): LegalDocument | undefined {
  if (!slug) return undefined;
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
