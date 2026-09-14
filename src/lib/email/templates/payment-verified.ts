import { siteConfig } from "@/lib/data";

interface PaymentVerifiedEmailOptions {
  name: string;
  transactionId: string;
  /**
   * What the participant entered, already joined by `describeEntry` — rendered as
   * one line rather than re-split, because the description itself is a `·`
   * separated sentence and guessing at separators would mangle it.
   */
  segments: string;
  /** When the payment was confirmed, already formatted in the admin timezone. */
  verifiedOn: string;
  /** The amount a forwarded SMS reported, already formatted. Omitted when unknown. */
  amount?: string;
}

/**
 * The interpolated names, TrxIDs and event descriptions are whatever the
 * participant typed, so they are escaped before they reach the markup — an email
 * client is a renderer like any other. No dependency for this: the replacement
 * table is the whole of what HTML needs.
 */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function detailRow(label: string, value: string, mono = false): string {
  return `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #6b7280; width: 40%;">
                    ${label}
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; font-weight: 600; ${mono ? "font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;" : ""}">
                    ${value}
                  </td>
                </tr>`;
}

export function getPaymentVerifiedEmailHtml({
  name,
  transactionId,
  segments,
  verifiedOn,
  amount,
}: PaymentVerifiedEmailOptions): string {
  const safeName = escapeHtml(name || "there");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed - ${siteConfig.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); max-width: 560px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #ff7053; padding: 32px 24px;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                ${siteConfig.name}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
                Your payment is confirmed
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0;">
                Hello ${safeName},
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 8px 0;">
                We have verified your bKash payment for STEM Fest. Your registration is confirmed for the events below — keep this email as your receipt.
              </p>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 8px 0;">
${detailRow("Transaction ID", escapeHtml(transactionId), true)}
${amount ? detailRow("Amount received", escapeHtml(amount)) : ""}
${detailRow("Confirmed on", verifiedOn)}
              </table>

              <p style="font-size: 12px; line-height: 1.5; color: #6b7280; margin: 24px 0 6px 0; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">
                Confirmed events
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #111827; margin: 0;">
                ${escapeHtml(segments || "General")}
              </p>

              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

              <p style="font-size: 12px; line-height: 1.5; color: #9ca3af; margin: 0;">
                If you believe this is a mistake, or your TrxID or events look wrong, reply to this email or contact the club before the event.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                &copy; ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
