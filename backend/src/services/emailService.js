const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
};

const sendEscalationEmail = async ({ userEmail, unansweredQuestion, conversationHistory, sessionId }) => {
  const mailer = getTransporter();

  const transcriptHTML = conversationHistory.map(msg => `
    <div style="margin: 8px 0; padding: 12px; border-radius: 8px; background: ${msg.role === 'user' ? '#f0f4ff' : '#f9fafb'}; border-left: 3px solid ${msg.role === 'user' ? '#4f46e5' : '#10b981'}">
      <strong style="color: ${msg.role === 'user' ? '#4f46e5' : '#10b981'}; text-transform: capitalize;">${msg.role}</strong>
      <p style="margin: 4px 0; color: #374151;">${msg.content.replace(/\n/g, '<br>')}</p>
      ${msg.created_at ? `<small style="color: #9ca3af;">${new Date(msg.created_at).toLocaleString()}</small>` : ''}
    </div>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px; }
    .container { max-width: 680px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.7; font-size: 14px; }
    .alert-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px; }
    .section { padding: 0 24px 24px; }
    .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px; }
    .value { font-size: 15px; color: #111827; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .question-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; font-size: 15px; color: #991b1b; font-weight: 500; }
    .transcript { margin-top: 8px; }
    .footer { background: #f9fafb; padding: 20px 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Customer Escalation Alert</h1>
      <p>A customer asked a question outside the knowledge base and needs your assistance.</p>
    </div>

    <div class="alert-box">
      <strong>⚠️ Action Required:</strong> This customer's question could not be answered from the knowledge base. Please follow up directly.
    </div>

    <div class="section">
      <div class="label">Customer Email</div>
      <div class="value"><a href="mailto:${userEmail}" style="color: #4f46e5;">${userEmail}</a></div>
    </div>

    <div class="section">
      <div class="label">Unanswered Question</div>
      <div class="question-box">${unansweredQuestion}</div>
    </div>

    <div class="section">
      <div class="label">Session ID</div>
      <div class="value" style="font-family: monospace; font-size: 13px;">${sessionId}</div>
    </div>

    <div class="section">
      <div class="label">Full Conversation Transcript</div>
      <div class="transcript">${transcriptHTML}</div>
    </div>

    <div class="footer">
      This email was sent automatically by your RAG Customer Support System.<br>
      Please reply directly to <a href="mailto:${userEmail}">${userEmail}</a> to assist this customer.
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: `"Support System" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    replyTo: userEmail,
    subject: `🚨 Escalation: "${unansweredQuestion.slice(0, 60)}..." — Customer: ${userEmail}`,
    html,
    text: `Escalation from ${userEmail}\n\nUnanswered Question: ${unansweredQuestion}\n\nConversation:\n${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`,
  };

  const info = await mailer.sendMail(mailOptions);
  console.log(`[Email] Escalation email sent: ${info.messageId}`);
  return info;
};

const sendUserConfirmationEmail = async ({ userEmail, unansweredQuestion }) => {
  const mailer = getTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px; color: white; text-align: center; }
    .body { padding: 32px; }
    .question-box { background: #f0f4ff; border-radius: 8px; padding: 16px; margin: 16px 0; color: #4f46e5; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0; font-size: 22px;">We've got your question! ✅</h1>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p>Thank you for reaching out. Our support team has been notified about your question:</p>
      <div class="question-box">"${unansweredQuestion}"</div>
      <p>A team member will get back to you at <strong>${userEmail}</strong> as soon as possible, typically within 24 hours.</p>
      <p>Thank you for your patience!</p>
      <p style="color: #6b7280; font-size: 14px;">— The Support Team</p>
    </div>
  </div>
</body>
</html>`;

  await mailer.sendMail({
    from: `"Support Team" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'We received your question — someone will follow up soon',
    html,
  });
};

module.exports = { sendEscalationEmail, sendUserConfirmationEmail };
