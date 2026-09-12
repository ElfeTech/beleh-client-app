# Acceptable Use Policy

**Beleh AI (ብልህ)**
**Last updated:** 15 August 2026
**Effective:** 15 August 2026

---

## 1. Purpose and scope

This Acceptable Use Policy (**"AUP"**) sets the rules for using **Beleh AI (ብልህ)** (the **"Service"**), operated by **Yulona FZE LLC** (**"Yulona"**).

This AUP forms part of, and is incorporated by reference into, the **Terms of Use**. It applies to every person who accesses the Service, including account holders, Workspace owners, invited Members, and anyone using credentials issued under an account. Capitalised terms not defined here have the meaning given in the Terms of Use.

**Account holders are responsible for their Members' compliance.** Violations may result in warning, throttling, feature restriction, suspension, or termination without refund, and in referral to law enforcement where appropriate.

---

## 2. General standard

You must use the Service lawfully, honestly, and in a way that does not harm Yulona, other customers, your own data subjects, or third parties. Where this AUP does not address a specific situation, that standard governs.

---

## 3. Security and integrity

You must not:

- (a) access or attempt to access any Workspace, account, data, or system you are not authorised to access;
- (b) probe, scan, or test the vulnerability of the Service, or breach or circumvent any authentication, authorisation, rate limit, quota, or security measure, without Yulona's prior written authorisation;
- (c) conduct penetration testing, load testing, benchmarking, or red-teaming against the Service without prior written authorisation;
- (d) upload, transmit, or introduce malware, ransomware, worms, logic bombs, or any other malicious or destructive code;
- (e) use the Service to attack, overload, disrupt, or gain unauthorised access to any third-party system, whether through connected databases, generated queries, or otherwise;
- (f) interfere with metering, billing, quota enforcement, logging, or usage reporting;
- (g) impersonate any person or entity, or misrepresent your affiliation;
- (h) share, sell, or transfer account credentials, or permit account sharing between individuals; or
- (i) take any action that imposes an unreasonable or disproportionate load on the Service or its infrastructure.

---

## 4. Commercial restrictions

You must not:

- (a) reverse engineer, decompile, disassemble, or attempt to discover the source code, model weights, system prompts, or underlying architecture of the Service, except to the extent that restriction is unenforceable under applicable law;
- (b) copy, scrape, mirror, or systematically extract the Service's content, interface, or outputs other than through documented APIs;
- (c) use the Service, or any output of it, to develop, train, benchmark, or improve a competing product, model, or service;
- (d) resell, sublicense, rent, lease, timeshare, white-label, or make the Service available to third parties as a service bureau, without a written agreement with Yulona;
- (e) remove, obscure, or alter any proprietary notice; or
- (f) circumvent plan limits, including by creating multiple accounts to obtain additional free-plan capacity.

---

## 5. Data restrictions

You must not submit to the Service, or expose to it through a Connected Source:

- (a) data you are not authorised to process, or whose processing would breach a contract, duty of confidentiality, licence, or applicable law;
- (b) **Restricted Data** as defined in clause 6.4 of the Terms of Use, including protected health information, payment card data, government identification numbers, biometric or genetic data, children's data, classified or export-controlled data, and special categories of personal data;
- (c) personal data for which you lack a valid lawful basis and have not provided the required notices;
- (d) content that infringes any intellectual property, privacy, publicity, or confidentiality right; or
- (e) unlawful, defamatory, harassing, or otherwise harmful content.

You must apply data minimisation: connect only the schemas and tables you need, using read-only, least-privilege credentials.

---

## 6. Prohibited uses of AI outputs

The Service produces AI-generated analysis. It is decision support, not a decision-maker, and it can be wrong. You must not use the Service, or its outputs:

**6.1 As a substantial basis for consequential decisions about individuals**, including decisions concerning:
- employment, recruitment, promotion, discipline, termination, or worker monitoring and evaluation;
- creditworthiness, lending, debt collection, or financial account eligibility;
- insurance underwriting, pricing, or claims determination;
- housing or tenancy;
- education admission, assessment, or proctoring;
- healthcare, diagnosis, treatment, or triage;
- eligibility for public benefits or essential services;
- immigration, asylum, or border control; or
- law enforcement, criminal justice, risk assessment, or predictive policing.

**6.2 For safety-critical purposes**, including any use where failure or inaccuracy could result in death, personal injury, or severe environmental or property damage — for example medical devices, clinical decision support, vehicle or aircraft control, industrial safety systems, or critical infrastructure operation.

**6.3 For surveillance, profiling, and re-identification**, including:
- inferring or attempting to infer an individual's race, ethnicity, religion, political opinions, health status, sexual orientation, trade union membership, or other special-category attributes;
- re-identifying individuals in anonymised or pseudonymised datasets you do not control;
- biometric categorisation or emotion inference;
- social scoring of individuals or groups; or
- covert monitoring of individuals in breach of applicable law.

**6.4 To mislead**, including:
- presenting Analysis Outputs as professional legal, medical, financial, investment, tax, accounting, actuarial, or other regulated advice;
- presenting Analysis Outputs as audited, verified, certified, or independently assured figures;
- publishing outputs in financial statements, investor materials, regulatory filings, prospectuses, or public reporting without independent verification and appropriate review;
- generating deceptive analytics, manipulated statistics, or misleading visualisations intended to defraud or mislead any person; or
- attributing an output to Yulona, or implying Yulona's endorsement of a conclusion.

**6.5 Regulated and high-risk sectors.** If your use falls within a regulated activity or a high-risk AI classification under applicable law (including the EU AI Act), you are the deployer and are responsible for all resulting obligations, including risk assessment, human oversight, transparency, logging, and registration. Yulona does not accept, and expressly disclaims, any provider or deployer obligation on your behalf.

---

## 7. Your responsibilities for outputs

- **Verify before you rely.** Check every figure, aggregation, filter, and join against your source systems before acting on it or sharing it.
- **Maintain human oversight.** A qualified person must review outputs before they inform any material business decision.
- **Label appropriately.** Where you share outputs externally, indicate that they are AI-generated and unverified.
- **Do not automate blindly.** Do not build automated workflows that act on Analysis Outputs without human review, where those actions have material consequences.

---

## 8. Fair use and resource limits

You must use the Service within the quotas of your plan and must not artificially inflate usage, run queries designed to consume disproportionate resources, or use automated tooling to generate load beyond normal interactive use. Yulona may throttle, rate-limit, or suspend usage that materially degrades the Service for others, and will use reasonable efforts to give notice before doing so where circumstances permit.

---

## 9. Connected Sources

When you connect a data source, you are directing the Service to issue queries against your own infrastructure. You are responsible for:

- ensuring you are authorised to connect that source;
- provisioning **read-only, least-privilege** credentials scoped to the minimum necessary schemas and tables;
- your source's capacity to bear query load, and for any performance impact;
- maintaining independent backups; and
- rotating and revoking credentials appropriately.

You must not connect a source belonging to a third party without that party's authorisation, or use the Service to query systems you do not own or control without permission.

---

## 10. Reporting

Report suspected abuse, security vulnerabilities, or violations of this AUP to **hello@yulona.co**. Include enough detail for us to reproduce and assess the issue. Do not test against production systems or access other customers' data while investigating. We will acknowledge reports and, where a vulnerability is confirmed, work in good faith toward a resolution. Please allow a reasonable period before public disclosure.

---

## 11. Enforcement

**11.1** Yulona may investigate suspected violations and may access account and usage data as reasonably necessary to do so.

**11.2** Depending on severity, we may: issue a warning; require corrective action; throttle or restrict features; suspend access to a Workspace, source, or account; terminate the account; retain or disclose relevant records; or report the matter to law enforcement or a competent authority.

**11.3** For violations involving security, illegality, or Restricted Data, we may act **immediately and without prior notice**.

**11.4** Suspension or termination under this AUP does not entitle you to any refund, and does not relieve you of accrued payment obligations.

**11.5** We are not obliged to monitor use of the Service, and any failure to act on a violation is not a waiver of our right to act on it or on any other violation later.

---

## 12. Changes

We may update this AUP as the Service and the legal landscape change. The current version is always posted at https://beleh.yulona.co with the "Last updated" date. Material changes take effect on the later of 30 days after notice and the stated effective date, except where a change is required by law or to address an urgent security or legal risk, in which case it may take effect immediately.

---

## 13. Contact

**Yulona FZE LLC**
Business Centre, Sharjah Publishing City Free Zone, Sharjah, United Arab Emirates
Abuse and security: **hello@yulona.co** · Support: **drop@yulona.co**