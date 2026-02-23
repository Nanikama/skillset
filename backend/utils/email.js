const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send enrollment confirmation email
 */
exports.sendEnrollmentEmail = async ({ to, name, packageName, amount }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.1); }
        .header  { background: linear-gradient(135deg, #f97316, #fbbf24); padding: 32px 40px; color: #fff; }
        .header h1 { margin: 0; font-size: 1.8rem; font-weight: 900; letter-spacing: -1px; }
        .body    { padding: 36px 40px; color: #334155; line-height: 1.7; }
        .badge   { display: inline-block; background: #fff3ea; border: 1px solid #f97316; color: #f97316; padding: 6px 16px; border-radius: 100px; font-weight: 700; font-size: .88rem; margin-bottom: 20px; }
        .highlight { background: #fff8f0; border-left: 4px solid #f97316; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .footer  { background: #f8fafc; padding: 20px 40px; font-size: .8rem; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
        a.cta    { display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: #fff; padding: 13px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>🎓 Skillbrzee</h1>
          <p style="margin:8px 0 0;opacity:.85;">India's Trusted Learning Platform</p>
        </div>
        <div class="body">
          <div class="badge">✅ Enrollment Confirmed</div>
          <h2 style="margin:0 0 8px;color:#0f172a;">Welcome, ${name}!</h2>
          <p>We're thrilled to confirm your enrollment. Your learning journey starts now! 🚀</p>
          <div class="highlight">
            <strong>Package:</strong> ${packageName}<br>
            <strong>Amount Paid:</strong> ₹${(amount / 100).toLocaleString('en-IN')}<br>
            <strong>Access:</strong> Lifetime
          </div>
          <p>You now have full access to all the course materials included in your package. Log in to your dashboard to start learning.</p>
          <a class="cta" href="https://skillbrzee.in">Go to My Dashboard →</a>
          <p style="margin-top:24px;">Need help? Reply to this email or contact us at <a href="mailto:support@skillbrzee.in" style="color:#f97316;">support@skillbrzee.in</a></p>
        </div>
        <div class="footer">
          © 2026 Skillbrzee · Hyderabad, Telangana, India<br>
          <a href="https://skillbrzee.in" style="color:#f97316;">skillbrzee.in</a>
        </div>
      </div>
    </body>
    </html>`;

  try {
    await transporter.sendMail({
      from   : process.env.EMAIL_FROM || 'Skillbrzee <support@skillbrzee.in>',
      to,
      subject: `🎓 Enrollment Confirmed — ${packageName}`,
      html,
    });
    console.log(`📧 Enrollment email sent to ${to}`);
  } catch (err) {
    console.error('📧 Email send failed:', err.message);
    // Don't throw — email failure shouldn't break the enrollment flow
  }
};

/**
 * Send welcome email on registration
 */
exports.sendWelcomeEmail = async ({ to, name }) => {
  try {
    await transporter.sendMail({
      from   : process.env.EMAIL_FROM || 'Skillbrzee <support@skillbrzee.in>',
      to,
      subject: '👋 Welcome to Skillbrzee!',
      html   : `<p>Hi ${name},</p><p>Welcome to Skillbrzee! Explore our packages at <a href="https://skillbrzee.in">skillbrzee.in</a></p><p>— Team Skillbrzee</p>`,
    });
  } catch (err) {
    console.error('📧 Welcome email failed:', err.message);
  }
};
