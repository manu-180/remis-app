# Threat Model — remis_app

## Scope

This threat model covers the remis_app platform as deployed for a small remisería operation in Santa Rosa, La Pampa, Argentina. The system handles ~50 drivers, 1 dispatcher, and ~200 passengers. It processes real money via MercadoPago, stores driver identity documents and biometrics (KYC), and exposes real-time location data for active trips. The threat model is current as of April 2026.

Out of scope: Supabase-managed infrastructure internals, Twilio carrier network, AWS Rekognition service internals, MercadoPago payment processing internals.

---

## Components

- **Driver App** — Flutter (Android + iOS). Manages trip acceptance, GPS tracking, in-app chat, earnings, and KYC selfie capture.
- **Passenger App** — Flutter (Android + iOS). Trip booking, real-time tracking, masked calling, payment, ratings.
- **Dispatcher Panel** — Next.js web app. Real-time trip queue, driver assignment, manual override, monitoring.
- **Supabase Backend** — Postgres with Row Level Security (RLS), Edge Functions (Deno), Realtime websockets, Supabase Auth (JWT).
- **External Integrations** — Twilio (masked calls/SMS), MercadoPago (payments), Didit (KYC document verification), AWS Rekognition (face matching).

---

## STRIDE Analysis

### Driver App (Flutter)

| Threat Type | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Spoofing | Driver lends phone/credentials to unlicensed driver (Fraud Case 1 and 4). Attacker authenticates as a legitimate driver using stolen JWT. | High | High | Device binding (UUID pinned to account), face re-verification on session start, KYC photo vs real-time selfie comparison via Rekognition. |
| Spoofing | Driver resets device to decouple binding, then logs in from a new device to bypass binding checks. | Medium | High | New device registration requires dispatcher manual approval + re-KYC selfie. |
| Tampering | Driver enables airplane mode mid-trip to freeze GPS, then resumes — inflating perceived distance/time for fare fraud (Fraud Case 2). | High | Medium | Backend computes fare from server-side trip timestamps and last-known polyline. GPS gap > 90 seconds flags trip for review. No GPS, no fare increment. |
| Tampering | Driver modifies the APK to fake GPS coordinates (mock location injection on rooted Android devices). | Medium | High | SafetyNet/Play Integrity attestation check on session start. Trips from devices failing attestation are flagged. iOS equivalent: DeviceCheck. |
| Repudiation | Driver claims they completed a trip that the system recorded as cancelled, or vice versa. | Medium | Medium | Immutable security event log in Supabase (append-only table, no UPDATE/DELETE via RLS). Trip lifecycle state machine with server-side transitions only. |
| Repudiation | Driver denies they were the one driving (claims phone was lent) to avoid a penalty. | Medium | Medium | Device binding logs + KYC session selfie timestamp creates non-repudiable record of who authenticated. |
| Info Disclosure | JWT stored insecurely in device storage, extractable if device is physically compromised. | Low | High | Flutter Secure Storage (Keychain on iOS, Android Keystore-backed EncryptedSharedPreferences). Token expiry: 1 hour access token, 7-day refresh. |
| Info Disclosure | Driver app logs contain passenger PII (name, phone, pickup address) visible in Android logcat or crash reports. | Medium | High | Strip PII from all log statements before release. Use masked identifiers (passenger_id, not raw phone). Crash reporting (e.g. Sentry) must have PII scrubbing enabled. |
| Denial of Service | Driver spams trip completion/cancellation API to trigger backend rate limit and disable the driver's own ability to receive trips (self-DOS to game the system) (Fraud Case 5). | Medium | Medium | Rate limit: max 10 cancellations per hour per driver. Excess triggers automated suspension + dispatcher alert. |
| Elevation of Privilege | Driver API calls attempt to access dispatcher-only endpoints (e.g., manual assignment, driver list). | Low | High | Supabase RLS policies enforce role separation. Edge Functions check `auth.jwt() -> role` claim. Driver JWT cannot contain `dispatcher` role. |

---

### Passenger App (Flutter)

| Threat Type | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Spoofing | Attacker creates a passenger account with a fake phone number using a temporary SIM (common in Argentina with prepaid lines). | High | Medium | Phone OTP verification required. Account creation rate limit per IP and per phone prefix. Suspicious patterns (multiple accounts from same device fingerprint) flagged. |
| Spoofing | Attacker takes over a passenger account via SIM swap (more viable with Argentine prepaid carriers). | Low | High | Re-authentication required for payment method changes. Security event logged on new device login. Dispatcher notified of account anomalies. |
| Tampering | Passenger intercepts the Twilio proxy number via repeated calls to infer the driver's real phone number (Fraud Case related). | Low | Medium | Twilio Proxy session-scoped numbers. Number rotation after each trip. No direct lookup possible through proxy API. |
| Tampering | Passenger submits a manipulated fare dispute claim (e.g., falsely claims trip was longer than recorded). | Medium | Low | All trip data (GPS polyline, timestamps, fare calculation) is server-side and immutable. Disputes reference server records, not client-submitted data. |
| Repudiation | Passenger denies requesting a trip after driver is already en route, causing driver financial loss. | Medium | Medium | Trip request is a signed server-side event. Cancellation after driver acceptance triggers cancellation fee (MercadoPago hold). |
| Info Disclosure | Passenger's home/work address patterns inferred from trip history (serious privacy concern under Argentine Ley 25.326). | Medium | High | Trip history retained for 12 months then purged or anonymized. Addresses stored encrypted. Passengers can request data deletion (Ley 25.326 right of suppression). |
| Info Disclosure | Real-time passenger location visible to driver before trip acceptance — driver could screen for high-value areas. | Low | Medium | Passenger pickup pin only shown after trip is confirmed. Approximate area (block-level) shown during matching, not exact coordinate. |
| Denial of Service | Passenger floods the booking endpoint to exhaust driver availability in the system. | Low | Medium | Rate limit: 5 trip requests per passenger per 10 minutes. Unmatched requests expire after 3 minutes. |
| Elevation of Privilege | Passenger JWT used to call driver-role endpoints (e.g., accepting a trip on behalf of a driver). | Low | High | RLS and Edge Function role checks. Passenger JWT role claim `passenger` is enforced at the policy layer. Cannot be escalated client-side. |

---

### Dispatcher Panel (Next.js)

| Threat Type | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Spoofing | Attacker gains access to the dispatcher panel using stolen credentials. There is only 1 dispatcher account — compromise is total. | Medium | Critical | MFA enforced (TOTP). Session bound to IP range (Santa Rosa office IP). Unusual login location triggers account lockout + SMS alert to owner. |
| Spoofing | Attacker forges HTTP requests to the Next.js API routes impersonating the dispatcher session. | Low | Critical | CSRF tokens on all state-mutating requests. SameSite=Strict cookies. Authorization header validation on API routes. |
| Tampering | Attacker with dispatcher access manually reassigns trips, alters driver statuses, or modifies fare records. | Low | Critical | All dispatcher actions are logged in the security event log with actor ID, timestamp, and payload diff. Logs are immutable. |
| Repudiation | Dispatcher denies having manually assigned a driver to a specific trip. | Low | High | Immutable audit log for all manual assignments (who, when, from which IP, which driver assigned to which trip). |
| Info Disclosure | Dispatcher panel exposes full driver list including phone numbers, ID documents, and location history to anyone who can load the page. | Low | Critical | Panel is not publicly indexed. Requires authenticated session. Sensitive fields (phone, DNI number) are masked by default in UI; require explicit reveal action (logged). |
| Denial of Service | Targeted HTTP flood against the dispatcher panel's Next.js API routes during peak hours (e.g., Friday night). | Low | High | Vercel edge rate limiting. Supabase connection pooling. Critical operations degrade gracefully — existing trip assignments persist even if new requests fail. |
| Elevation of Privilege | A passenger or driver discovers the dispatcher panel URL and attempts to authenticate using their own JWT. | Low | Critical | Dispatcher panel validates `role = dispatcher` from Supabase JWT. No passenger/driver JWT grants access regardless of URL knowledge. |

---

### Supabase Backend (Postgres + Edge Functions)

| Threat Type | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Spoofing | Attacker forges a JWT with a fabricated role claim to bypass RLS policies. | Low | Critical | JWTs signed with Supabase project secret (HS256). Secret rotation procedure documented. Anon key is public but grants only unauthenticated scope. Service role key never exposed to client apps. |
| Tampering | SQL injection via Edge Function inputs that are not parameterized. | Low | Critical | All DB queries use parameterized statements. Edge Functions never interpolate user input into raw SQL. Input validated at Edge Function entry point before hitting DB. |
| Tampering | Attacker exploits a gap in RLS policies to read or modify another user's trips, location, or payment data. | Medium | High | RLS enabled on all tables. Policies tested against each role (passenger, driver, dispatcher, anon). Quarterly RLS audit. `security definer` functions documented and minimized. |
| Tampering | Driver's open trip record is modified client-side or via API to mark it complete without the passenger confirming arrival (Fraud Case 3). | High | Medium | Trip state transitions are enforced server-side in Edge Functions. Client sends events (e.g., `driver_arrived`), not state directly. Server validates transition legality. |
| Repudiation | Security events deleted or modified to cover up fraud. | Low | High | `security_events` table: INSERT only via RLS. No UPDATE or DELETE allowed for any role including authenticated users. Only service role can read for auditing. |
| Info Disclosure | Supabase anon key included in Flutter app binary, allowing unauthenticated API access. | High | Medium | Anon key is expected to be in client; RLS limits what anon can do (only signup/login endpoints). Sensitive data requires authenticated JWT. Anon key is not the service role key. |
| Info Disclosure | Edge Function error responses leak stack traces, DB schema details, or internal IP ranges. | Medium | Medium | Edge Functions return generic error messages to clients. Detailed errors logged server-side only. No raw Postgres error messages forwarded to clients. |
| Denial of Service | Mass concurrent requests exhaust Supabase connection pool or Edge Function concurrency limits. | Low | High | PgBouncer connection pooling. Edge Function concurrency limits configured. Rate limiting at Edge Function layer (100 req/min per IP for auth endpoints, 30 req/min for trip creation). |
| Elevation of Privilege | Edge Function invoked with service role key accidentally bundled in client app. | Low | Critical | Service role key stored only in Supabase Vault and CI/CD secrets. Never in Flutter app or Next.js client-side code. Audit: `grep -r "service_role"` in CI pipeline. |

---

### External Integrations

| Threat Type | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Spoofing | Attacker submits a fake/altered ID document image to bypass Didit KYC during driver onboarding (Fraud Case 4). | Medium | High | Didit NFC chip verification for DNI (Argentine DNI has NFC from 2012 onwards). AWS Rekognition compares selfie to document photo. Manual dispatcher review for edge cases. |
| Spoofing | Attacker replays a previously valid KYC approval to register a second driver account. | Low | High | KYC result tied to unique Didit verification session ID + Supabase user UID. Session IDs are single-use. DNI number uniqueness enforced at DB level. |
| Tampering | Attacker intercepts the Didit webhook and replaces a `rejected` KYC result with `approved`. | Low | Critical | Didit webhooks validated via HMAC signature. Supabase Edge Function verifies signature before processing. Webhook secret stored in Supabase Vault. |
| Tampering | MercadoPago payment notification (webhook) forged to mark a trip as paid without actual payment. | Low | Critical | MercadoPago webhooks verified via their official signature header (`x-signature`). Payment status confirmed by querying MercadoPago API directly after webhook receipt, not trusting webhook payload alone. |
| Info Disclosure | Twilio proxy call logs containing masked numbers accessible via compromised Twilio credentials. | Low | Medium | Twilio API keys stored in Supabase Vault. Key rotation every 90 days. Twilio subaccount used for isolation. Call logs retained for 30 days then deleted. |
| Denial of Service | Attacker triggers mass Didit KYC verifications (e.g., bot-driven driver registration) exhausting Didit API quota. | Low | Medium | Driver registration requires dispatcher approval before KYC is initiated. Rate limit: 5 KYC initiations per day. |

---

## Fraud Cases Mapped to STRIDE

| # | Fraud Case | STRIDE Category | Component |
|---|---|---|---|
| 1 | Driver lends account/phone to unlicensed driver | Spoofing | Driver App, Supabase Backend |
| 2 | Airplane mode fare inflation (GPS freeze) | Tampering | Driver App, Supabase Backend |
| 3 | Driver does not close trip (meter keeps running) | Tampering | Supabase Backend (state machine bypass) |
| 4 | Different driver than KYC-registered person | Spoofing | Driver App, External Integrations (KYC) |
| 5 | Mass cancellations (gaming queue/penalties) | Denial of Service | Driver App, Supabase Backend |
| 6 | Account theft (passenger or driver account takeover) | Spoofing, Elevation of Privilege | Passenger App, Driver App, Supabase Auth |

---

## Regulatory Context (Argentina)

- **Ley 25.326 (Protección de Datos Personales)**: Biometric data (selfies, face vectors from Rekognition) and location data are sensitive personal data. Requires explicit informed consent, defined retention periods, and a right of access/deletion. Privacy policy must disclose all data processors (Didit, AWS, Twilio, MercadoPago).
- **Disposición AAIP**: Argentine data protection authority (AAIP) can audit and fine. Database must be registered if it contains biometric data.
- **Ley 24.240 (Defensa del Consumidor)**: Passenger disputes about fares are a consumer rights matter. Audit log of trip data is required to defend against consumer complaints.
- **Resolución 899/2023 (transporte de pasajeros)**: Provincial regulations on remis operations may require retention of driver identity verification records for a minimum period (verify with La Pampa provincial transport authority).

---

## Review Schedule

This threat model should be reviewed when any of the following occur:
- A new integration is added (new payment provider, new KYC vendor, etc.)
- A fraud case occurs that is not covered by this model
- A significant architecture change is made (new app feature, microservice split, etc.)
- Quarterly, regardless of changes

**Next scheduled review: July 2026**

Threat model owner: Technical lead / project owner (Manuel)
