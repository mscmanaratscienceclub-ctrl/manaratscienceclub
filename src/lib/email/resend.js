"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_FROM = exports.resend = void 0;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendResetPasswordEmail = sendResetPasswordEmail;
exports.sendPaymentVerifiedEmail = sendPaymentVerifiedEmail;
const resend_1 = require("resend");
const data_1 = require("@/lib/data");
const verification_email_1 = require("./templates/verification-email");
const reset_password_1 = require("./templates/reset-password");
const payment_verified_1 = require("./templates/payment-verified");
const apiKey = process.env.RESEND_API_KEY;
exports.resend = apiKey ? new resend_1.Resend(apiKey) : null;
/**
 * The `From:` identity every mail is sent with. `EMAIL_FROM` wins because the
 * address has to be one Resend has verified for the domain; the fallback is the
 * club's own public address rather than a Resend sandbox one, so a misconfigured
 * environment is a refused send (loud) instead of mail from `resend.dev`.
 */
exports.EMAIL_FROM = process.env.EMAIL_FROM || `${data_1.siteConfig.name} <${data_1.siteConfig.email}>`;
/** The dev log prints a link line only for mails that have one. */
function formatLink(url) {
    return url ? `  Link: ${url}\n` : "";
}
async function sendEmail({ subject, html, label, recipient, }) {
    const { to, name, url } = recipient;
    // No Resend API key (or placeholder key) → log the message for local dev.
    if (!apiKey || apiKey.startsWith("re_xxx") || apiKey.trim() === "") {
        console.info("\n=======================================================\n" +
            `  [DEV ${label}]\n` +
            `  To: ${to}\n` +
            `  Name: ${name}\n` +
            formatLink(url) +
            "=======================================================\n");
        return { success: true, simulated: true };
    }
    try {
        const { data, error } = await exports.resend.emails.send({
            from: exports.EMAIL_FROM,
            to,
            subject,
            html,
        });
        if (error) {
            console.warn("\n=======================================================\n" +
                `  [RESEND API NOTICE]: ${error.message}\n` +
                "  (Note: Resend free testing keys can only send to your account owner email).\n" +
                `  To: ${to}\n` +
                `  Name: ${name}\n` +
                formatLink(url) +
                "=======================================================\n");
            if (process.env.NODE_ENV !== "production") {
                return { success: false, error: error.message, simulated: true };
            }
            throw new Error(error.message);
        }
        return { success: true, data: data ?? undefined };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("\n=======================================================\n" +
            `  [RESEND EXCEPTION]: ${message}\n` +
            `  To: ${to}\n` +
            `  Name: ${name}\n` +
            formatLink(url) +
            "=======================================================\n");
        if (process.env.NODE_ENV !== "production") {
            return { success: false, error: message, simulated: true };
        }
        throw err;
    }
}
async function sendVerificationEmail(recipient) {
    return sendEmail({
        subject: `Verify your email address - ${data_1.siteConfig.name}`,
        html: (0, verification_email_1.getVerificationEmailHtml)({ name: recipient.name, url: recipient.url ?? "" }),
        label: "EMAIL VERIFICATION",
        recipient,
    });
}
async function sendResetPasswordEmail(recipient) {
    return sendEmail({
        subject: `Reset your password - ${data_1.siteConfig.name}`,
        html: (0, reset_password_1.getResetPasswordEmailHtml)({ name: recipient.name, url: recipient.url ?? "" }),
        label: "PASSWORD RESET",
        recipient,
    });
}
/**
 * The mail an admin's "Verified" sends: the participant is told a human checked
 * their bKash payment and their slots are confirmed. Fired from the Server Action
 * that records the decision, never from the SMS webhook — a public, retried,
 * unauthenticated endpoint is the wrong place to depend on a third party.
 */
async function sendPaymentVerifiedEmail({ to, name, transactionId, segments, verifiedOn, amount, }) {
    return sendEmail({
        subject: `Payment confirmed - STEM Fest registration, ${data_1.siteConfig.name}`,
        html: (0, payment_verified_1.getPaymentVerifiedEmailHtml)({
            name,
            transactionId,
            segments,
            verifiedOn,
            amount,
        }),
        label: "PAYMENT CONFIRMED",
        recipient: { to, name },
    });
}
