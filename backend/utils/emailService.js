const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends a password reset email to the specified address.
 * @param {string} toEmail - Recipient email address
 * @param {string} resetUrl  - Full reset link (e.g. http://localhost:3000/reset-password/<token>)
 */
const sendResetEmail = async (toEmail, resetUrl) => {
  const mailOptions = {
    from: `"Civic-Pulse" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Password Reset Request — Civic-Pulse',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f1e33; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #0a1734); padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 1.6rem; margin: 0; letter-spacing: 0.5px;">
            <span style="color: #3b82f6;">&#9679;</span> Civic-Pulse
          </h1>
        </div>
        <div style="padding: 36px 40px; background: #0f1e33;">
          <h2 style="color: #f8fafc; font-size: 1.2rem; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #cbd5e1; line-height: 1.7;">
            We received a request to reset the password for your Civic-Pulse account associated with <strong style="color: #93c5fd">${toEmail}</strong>.
          </p>
          <p style="color: #cbd5e1; line-height: 1.7;">
            Click the button below to set a new password. This link is valid for <strong style="color: #f8fafc;">1 hour</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 1rem; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 0.9rem; line-height: 1.6;">
            If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
          <p style="color: #475569; font-size: 0.8rem;">
            If the button above doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #60a5fa; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        <div style="background: #0a1328; padding: 16px 40px; text-align: center;">
          <p style="color: #475569; font-size: 0.75rem; margin: 0;">
            &copy; ${new Date().getFullYear()} Civic-Pulse. All rights reserved.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Sends a password change confirmation email.
 * @param {string} toEmail - Recipient email address
 */
const sendPasswordChangedEmail = async (toEmail) => {
  const mailOptions = {
    from: `"Civic-Pulse" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Password Has Been Changed — Civic-Pulse',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f1e33; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #0a1734); padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 1.6rem; margin: 0; letter-spacing: 0.5px;">
            <span style="color: #3b82f6;">&#9679;</span> Civic-Pulse
          </h1>
        </div>
        <div style="padding: 36px 40px; background: #0f1e33;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 2.5rem;">&#9989;</span>
          </div>
          <h2 style="color: #f8fafc; font-size: 1.2rem; margin-top: 0; text-align: center;">Password Changed Successfully</h2>
          <p style="color: #cbd5e1; line-height: 1.7;">
            This is a confirmation that the password for your Civic-Pulse account
            <strong style="color: #93c5fd">${toEmail}</strong> was changed.
          </p>
          <p style="color: #cbd5e1; line-height: 1.7;">
            If you did <strong style="color: #f8fafc;">not</strong> make this change, please contact the system administrator immediately or reset your password again.
          </p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;" />
          <p style="color: #475569; font-size: 0.8rem;">
            This is an automated security notification from Civic-Pulse. Please do not reply to this email.
          </p>
        </div>
        <div style="background: #0a1328; padding: 16px 40px; text-align: center;">
          <p style="color: #475569; font-size: 0.75rem; margin: 0;">
            &copy; ${new Date().getFullYear()} Civic-Pulse. All rights reserved.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail, sendPasswordChangedEmail, sendContactEmail };

/**
 * Forwards a contact form submission to the admin inbox.
 * @param {object} data - { name, email, topic, message }
 */
async function sendContactEmail({ name, email, topic, message }) {
  const topicLabels = {
    demo: 'Request Demo',
    support: 'Technical Support',
    partnership: 'Partnership Inquiry',
    other: 'Other'
  };
  const topicLabel = topicLabels[topic] || topic;

  const mailOptions = {
    from: `"Civic-Pulse Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,   // sends to the admin inbox
    replyTo: email,               // reply goes directly to the sender
    subject: `[Contact Form] ${topicLabel} — from ${name}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1e33; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #0a1734); padding: 28px 40px;">
          <h1 style="color: #ffffff; font-size: 1.4rem; margin: 0;">
            <span style="color: #3b82f6;">&#9679;</span> Civic-Pulse — New Contact Message
          </h1>
        </div>
        <div style="padding: 32px 40px; background: #0f1e33;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #94a3b8; padding: 8px 0; width: 100px; font-size: 0.9rem;">Name</td>
              <td style="color: #f8fafc; padding: 8px 0; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 8px 0; font-size: 0.9rem;">Email</td>
              <td style="color: #93c5fd; padding: 8px 0;">
                <a href="mailto:${email}" style="color: #93c5fd;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 8px 0; font-size: 0.9rem;">Topic</td>
              <td style="color: #f8fafc; padding: 8px 0;">${topicLabel}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 0.85rem; margin: 0 0 8px;">Message</p>
          <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; color: #cbd5e1; line-height: 1.7; white-space: pre-wrap;">
${message}
          </div>
          <p style="color: #475569; font-size: 0.8rem; margin-top: 20px;">
            Reply directly to this email to respond to ${name}.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}
