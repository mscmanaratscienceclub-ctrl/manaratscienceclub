# Sentinel Journal 🛡️

## 2025-05-14 - [Critical] Credential Leak in Browser Logs
**Vulnerability:** Plaintext user credentials (passwords) were being logged to the browser console during the signup process in `src/app/(routes)/(auth)/signup/form.tsx`.
**Learning:** Debugging logs left in production code can lead to critical credential leakage. Client-side logging of sensitive form data should be strictly avoided.
**Prevention:** Implement linting rules (like `no-console`) to catch accidental logging and use dedicated secure logging libraries for backend debugging.

## 2025-05-14 - [High] Incomplete Server-side Validation
**Vulnerability:** Server-side username validation was significantly weaker than client-side validation, only checking for exact matches against restricted words and lacking character set restrictions.
**Learning:** Discrepancies between client and server validation allow malicious users to bypass security restrictions using tools like Postman or by disabling JS.
**Prevention:** Always centralize validation logic or ensure strict parity between client-side schemas and server-side checks.

## 2025-05-14 - [Medium] Permissive HTML Sanitization
**Vulnerability:** The HTML sanitizer in the blog post rendering logic allowed the 'style' attribute globally and did not enforce 'rel="noopener noreferrer"' on external links ('target="_blank"').
**Learning:** Loosely configured sanitizers can leave the application vulnerable to UI redressing and tabnabbing. Allowing 'style' is particularly risky as it can be used to overlay malicious elements or hide legitimate ones.
**Prevention:** Use strict attribute whitelists and implement transformers in the sanitization process to automatically inject security headers like 'rel="noopener noreferrer"' for all external links.

## 2025-05-14 - [Medium] Information Leakage and Insecure File Handling
**Vulnerability:** The upload API leaked internal provider error messages and only validated client-provided MIME types, ignoring file extensions.
**Learning:** Internal error messages can expose infrastructure details (e.g., Supabase bucket names or DB constraints). Relying on `file.type` alone is insufficient as it is easily spoofed.
**Prevention:** Always return generic error messages to the client while logging detailed errors internally. Validate both MIME types and file extensions against a strict whitelist.
