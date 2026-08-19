interface ResetPasswordEmailOptions {
  name: string;
  url: string;
}

export function getResetPasswordEmailHtml({ name, url }: ResetPasswordEmailOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Manara Science Club</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0605; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0605; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); max-width: 560px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #17100b; padding: 32px 24px;">
              <h1 style="color: #ff7053; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                Manara Science Club
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
                Reset your password
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0;">
                Hello ${name ? name : "there"},
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 32px 0;">
                We received a request to reset the password for your Manara Science Club account. Click the button below to choose a new one. This link expires in 15 minutes.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td align="center" style="border-radius: 9999px; background-color: #ff7053;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 9999px;">
                      Reset Password
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
                If you didn't request a password reset, you can safely ignore this email — your password won't change.
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
