"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Temporary dev render: writes .email-preview/preview.html with all four
 * transactional emails at desktop + mobile widths. Deleted after review.
 */
const node_fs_1 = require("node:fs");
const verification_email_1 = require("../src/lib/email/templates/verification-email");
const reset_password_1 = require("../src/lib/email/templates/reset-password");
const payment_verified_1 = require("../src/lib/email/templates/payment-verified");
const custom_message_1 = require("../src/lib/email/templates/custom-message");
const mails = [
    {
        title: "Verification",
        html: (0, verification_email_1.getVerificationEmailHtml)({
            name: "Tasnim Rahman",
            url: "https://manaratscience.club/api/auth/verify-email?token=example-token-value&callbackURL=%2Fverify-email",
        }),
    },
    {
        title: "Reset password",
        html: (0, reset_password_1.getResetPasswordEmailHtml)({
            name: "Tasnim Rahman",
            url: "https://manaratscience.club/api/auth/reset-password?token=example-token-value",
        }),
    },
    {
        title: "Payment confirmed (with ID)",
        html: (0, payment_verified_1.getPaymentVerifiedEmailHtml)({
            registrationCode: "M7B042",
            name: "Tasnim Rahman",
            classLabel: "Class 7",
            school: "Manarat Dhaka International School & College",
            phone: "+880 1712 345678",
            transactionId: "8F7HK2LQX1",
            paymentNumber: "01712 345678",
            segments: "Olympiad Math · Science Quiz · Line Follower (Team Omega)",
            submittedOn: "26 Sep 2026, 4:12 pm",
            amount: "Tk 200",
        }),
    },
    {
        title: "Payment confirmed (legacy row, no ID)",
        html: (0, payment_verified_1.getPaymentVerifiedEmailHtml)({
            name: "Ayesha Karim",
            classLabel: "A2/12",
            school: "Manarat Dhaka International School & College",
            phone: "01912 003344",
            transactionId: "K2P9ZA77TR",
            paymentNumber: "01912 003344",
            segments: "Sci-Fi Story Writing",
            submittedOn: "25 Sep 2026, 10:05 am",
        }),
    },
    {
        title: "Custom message",
        html: (0, custom_message_1.getCustomEmailHtml)({
            subject: "Segment schedule change",
            body: "Dear {{name}},\n\nThe Line Follower briefing moves from Room 204 to the Auditorium. Reporting time is unchanged.\n\nSee you at the fest,\nMSC STEM Fest Team",
            name: "Tasnim",
        }),
    },
];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sections = mails
    .map(({ title, html }) => {
    const mobile = html
        .replace("padding: 40px 16px;", "padding: 12px 6px;")
        .replaceAll("max-width: 560px;", "max-width: 320px;");
    return `
  <section style="margin: 48px auto; max-width: 980px;">
    <h2 style="font: 600 18px system-ui; color: #142326; margin: 0 0 12px 0;">${esc(title)}</h2>
    <div style="display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap;">
      <iframe style="width: 600px; height: 980px; border: 1px solid #ddd; border-radius: 8px; background: #fff;" srcdoc="${esc(html)}"></iframe>
      <iframe style="width: 340px; height: 980px; border: 1px solid #ddd; border-radius: 8px; background: #fff;" srcdoc="${esc(mobile)}"></iframe>
    </div>
  </section>`;
})
    .join("\n");
(0, node_fs_1.mkdirSync)(".email-preview", { recursive: true });
(0, node_fs_1.writeFileSync)(".email-preview/preview.html", `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Email preview</title></head>
<body style="margin:0; padding: 24px; background: #ececec; font-family: system-ui;">
  <h1 style="font: 700 22px system-ui;">Email template preview</h1>
  <p style="font: 14px system-ui; color: #555;">Left: 600px desktop frame. Right: 320px mobile frame.</p>
${sections}
</body></html>`);
console.log("Wrote .email-preview/preview.html");
