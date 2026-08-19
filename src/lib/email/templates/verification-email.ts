interface VerificationEmailOptions {
  name: string;
  url: string;
}

export function getVerificationEmailHtml({ name, url }: VerificationEmailOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Manara Science Club</title>
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
                Manara Science Club
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
                Verify your email address
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                Hello ${name ? name : "there"},
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 32px 0;">
                Thank you for signing up for Manara Science Club! Please confirm your email address by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td align="center" style="border-radius: 9999px; background-color: #ff7053;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 9999px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.5; color: #6b7280; margin: 0 0 12px 0;">
                If the button above doesn't work, copy and paste this link into your web browser:
              </p>
              <p style="font-size: 12px; line-height: 1.4; color: #ff7053; word-break: break-all; margin: 0 0 32px 0;">
                <a href="${url}" style="color: #ff7053; text-decoration: underline;">${url}</a>
              </p>

              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

              <p style="font-size: 12px; line-height: 1.5; color: #9ca3af; margin: 0;">
                If you didn't request this email, you can safely ignore it. This link will expire shortly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                &copy; ${new Date().getFullYear()} Manara Science Club. All rights reserved.
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
