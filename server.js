const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ─── SendGrid email helper ──────────────────────────────────────────────────
async function sendEmail({ to, from, replyTo, subject, html }) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'All Brothers Lawn Squad' },
      reply_to: { email: replyTo },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid ${res.status}: ${body}`);
  }
}

// ─── Contact / Quote form endpoint ──────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, service, message } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const serviceName = {
      'lawn-care': 'Lawn Care',
      'pest-control': 'Insects & Pest Control',
      'snow-removal': 'Snow Removal',
      'multiple': 'Multiple Services',
      'not-sure': 'Not Sure — Need Consultation',
    }[service] || service || 'Not specified';

    await sendEmail({
      to: process.env.CONTACT_EMAIL || 'info@lawn-squad.com',
      from: process.env.SENDGRID_FROM || 'noreply@lawn-squad.com',
      replyTo: email,
      subject: `New Quote Request: ${first_name} ${last_name} — ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #075b31; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">New Quote Request from lawn-squad.com</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${first_name} ${last_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
              ${phone ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Phone</td><td style="padding: 8px 0;"><a href="tel:${phone}">${phone}</a></td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Service</td><td style="padding: 8px 0;">${serviceName}</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <div style="font-size: 14px; line-height: 1.6; color: #334155;">
              <strong>Message:</strong><br/>
              ${(message || 'No message provided.').replace(/\n/g, '<br/>')}
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <div style="font-size: 11px; color: #94a3b8;">
              Submitted ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
            </div>
          </div>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send. Please call us instead.' });
  }
});

// ─── Catch-all: serve index.html ────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`lawn-squad.com server listening on :${PORT}`));
