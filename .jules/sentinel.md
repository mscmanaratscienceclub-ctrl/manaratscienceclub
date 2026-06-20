# Sentinel Journal 🛡️

## 2025-05-14 - [Critical] Credential Leak in Browser Logs
**Vulnerability:** Plaintext user credentials (passwords) were being logged to the browser console during the signup process in `src/app/(routes)/(auth)/signup/form.tsx`.
**Learning:** Debugging logs left in production code can lead to critical credential leakage. Client-side logging of sensitive form data should be strictly avoided.
**Prevention:** Implement linting rules (like `no-console`) to catch accidental logging and use dedicated secure logging libraries for backend debugging.

## 2025-05-14 - [High] Incomplete Server-side Validation
**Vulnerability:** Server-side username validation was significantly weaker than client-side validation, only checking for exact matches against restricted words and lacking character set restrictions.
**Learning:** Discrepancies between client and server validation allow malicious users to bypass security restrictions using tools like Postman or by disabling JS.
**Prevention:** Always centralize validation logic or ensure strict parity between client-side schemas and server-side checks.
