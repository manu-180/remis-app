# Responsible Disclosure Policy — remis_app

*Last updated: April 2026*

---

## Overview

remis_app takes the security of its platform seriously. We operate a ride-hailing service in Santa Rosa, La Pampa, Argentina, and we handle sensitive personal data including the identity documents, biometrics, real-time location, and payment information of drivers and passengers. We welcome the help of security researchers in identifying vulnerabilities before malicious actors can exploit them.

This policy describes how to report vulnerabilities to us, what we commit to in return, and the boundaries of authorized research.

---

## Reporting a Vulnerability

**Primary contact:** security@[DOMAIN_PLACEHOLDER]

**PGP public key:** Published at `https://[DOMAIN_PLACEHOLDER]/.well-known/security.txt`

For vulnerabilities that involve sensitive personal data (e.g., you have accessed real user records, location data, or credentials as proof of concept), please encrypt your report with our PGP public key before sending. Do not send unencrypted PII via email.

For non-sensitive findings (e.g., missing security headers, exposed version strings), plain email is acceptable.

**Alternative contact:** If you do not receive a response within 72 hours, contact the project owner via the GitHub repository linked in our app store listings and mention that you have sent a security report.

---

## What to Include in Your Report

A useful report allows us to reproduce and triage the vulnerability quickly. Please include:

1. **Affected component**: Driver App (Android/iOS), Passenger App (Android/iOS), Dispatcher Panel, Supabase API, or a specific integration (Twilio, MercadoPago, Didit/KYC)
2. **Vulnerability type**: e.g., Broken Access Control, SQL Injection, Insecure Direct Object Reference, Authentication Bypass, Information Disclosure
3. **Steps to reproduce**: Numbered, precise steps from a clean starting state. Include specific endpoints, parameters, JWT manipulation steps, or app interactions
4. **Proof of concept**: Screenshots, HTTP request/response captures (Burp Suite export or raw cURL), or a screen recording. Do not include real passenger or driver personal data in your PoC — use test accounts (see below)
5. **Impact assessment**: In your view, what could an attacker realistically do with this vulnerability? Who is affected?
6. **Your suggested fix** (optional but appreciated): We take all suggestions seriously even if we implement a different solution
7. **Your contact information**: Name or handle, and preferred contact method for follow-up questions

---

## Test Accounts

To avoid accessing real user data during research, contact us at security@[DOMAIN_PLACEHOLDER] to request a set of test accounts (driver, passenger, dispatcher) on our staging environment. We will provision them within 48 hours of a reasonable request.

Research conducted using production accounts belonging to real users — even your own — may inadvertently expose other users' data and is not covered by this policy's safe harbor.

---

## Our Commitment to You

### Response times

| Milestone | Commitment |
|---|---|
| Acknowledgement of receipt | Within 72 hours of your email |
| Initial triage (severity assessment) | Within 7 business days |
| Fix timeline communicated | Within 14 business days |
| Critical severity fix deployed | Within 30 calendar days |
| High severity fix deployed | Within 60 calendar days |
| Medium severity fix deployed | Within 90 calendar days |
| Notification that the fix is live | Before or at public disclosure |

If we are unable to meet a deadline — for example, because a fix requires a coordinated third-party patch or a significant architecture change — we will communicate this proactively and agree on a revised timeline with you.

### Legal protection

Provided you follow this policy, we commit to:

- Not initiating or recommending legal action against you under Argentina's **Ley 26.388** (Computer Crimes), **Ley 11.723** (Intellectual Property), or any other law, in connection with your research
- Not contacting your employer, educational institution, or ISP about your research
- Working with you to understand and validate your findings before taking any enforcement action

This commitment applies to good-faith research only. It does not extend to research that causes harm, disrupts service for real users, or exfiltrates real user data unnecessarily.

---

## Scope

### In Scope

The following assets are authorized for security research under this policy:

- `https://dispatcher.[DOMAIN_PLACEHOLDER]` — Dispatcher Panel web application
- `https://[PROJECT_ID].supabase.co` — Supabase API (REST, Realtime, Edge Functions)
- Driver App APK (Android) — current version available on request for testing
- Passenger App APK (Android) — current version available on request for testing
- Driver App (iOS) — TestFlight build available on request for testing
- Passenger App (iOS) — TestFlight build available on request for testing

### Out of Scope

The following are explicitly not authorized for testing:

- **Supabase infrastructure**: The managed PostgreSQL host, Supabase's own authentication servers, Supabase Studio, and any Supabase.io domains not listed above. Vulnerabilities in Supabase's own platform should be reported directly to Supabase at security@supabase.io.
- **Twilio infrastructure**: Any Twilio.com services, APIs, or carrier routing. Report Twilio vulnerabilities to security@twilio.com.
- **MercadoPago infrastructure**: Any MercadoPago.com payment processing services. Report to MercadoPago's responsible disclosure program.
- **AWS infrastructure**: Any Amazon Web Services systems, including Rekognition endpoints. Report AWS vulnerabilities to aws-security@amazon.com.
- **Didit infrastructure**: Any Didit.me verification systems. Contact Didit directly.
- **Social engineering**: Phishing, vishing, or pretexting attacks against our staff, drivers, or passengers.
- **Physical attacks**: Attempting to access physical devices, office premises, or hardware.
- **Denial of service testing against production**: Do not perform load testing, fuzzing, or resource exhaustion tests against the production environment. Use the staging environment only.
- **Spam and automated scanning of production**: Do not run automated scanners (Nessus, Burp active scan, sqlmap) against production endpoints. Request staging credentials.
- **Attacks requiring access to a victim's device or account**: Vulnerabilities that require you to already have full control of the target's phone or account are out of scope.

---

## Disclosure Timeline and Coordination

We follow a **coordinated disclosure** model:

1. You report the vulnerability to us privately
2. We confirm receipt and begin triage within the timelines above
3. We fix the vulnerability and deploy the fix
4. We notify you that the fix is live
5. You may publish your findings at any time after we confirm the fix is deployed

If we cannot fix the vulnerability within the committed timeline, we will discuss an extension with you. If we cannot agree, you may publish after giving us at least 14 additional calendar days of notice.

We ask that you:
- Not publish or share the vulnerability details with any third party before the fix is confirmed live
- Not exploit the vulnerability beyond what is necessary to demonstrate its existence
- Not use the vulnerability to access, retain, or exfiltrate real user data

---

## Recognition

We are a small operation, but we value the contribution of security researchers.

**Credit**: If you would like to be credited by name (or handle) in our release notes or security acknowledgements page when a fix is published, let us know in your report. We will include your preferred attribution.

**Swag**: For valid High or Critical severity findings, we will send a small thank-you package (remis_app merchandise) to researchers who provide a mailing address. This is a token of appreciation, not a bounty, and is at our discretion.

**Bug bounty program**: We do not currently operate a formal paid bug bounty program. If the project grows to a scale where a formal program is warranted, this policy will be updated with that information.

---

## Safe Harbor

remis_app considers security research conducted under the terms of this policy to be authorized activity. If a third party (including law enforcement or legal counsel) initiates action against you for activities conducted in compliance with this policy, we will make reasonable efforts to clarify that your actions were authorized by us and were conducted in good faith.

This safe harbor applies only to conduct that:
- Complies with all terms of this policy
- Does not cause harm to real users or disruption to production services
- Does not involve the retention or exfiltration of real user personal data
- Is conducted on the in-scope assets listed above

We cannot provide safe harbor for activities conducted outside this policy or for violations of applicable Argentine law that go beyond the scope of authorized security research.

---

## Regulatory Note (Argentina)

Argentina's Ley 25.326 (Protección de Datos Personales) and Ley 26.388 (Delitos Informáticos) establish legal boundaries around accessing computer systems and personal data without authorization. This policy constitutes our explicit authorization for good-faith security research on the assets listed in scope. Accessing real user personal data (even accidentally) should be stopped immediately and reported to us so we can assess whether a breach notification obligation exists under Ley 25.326.

---

*This policy is based on the coordinated disclosure best practices of the Internet Bug Bounty program and CISA's coordinated vulnerability disclosure guidelines.*
