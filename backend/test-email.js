require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

(async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection works!');
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test email from RAG system',
      text: 'If you see this, email is working!',
    });
    console.log('✅ Email sent:', info.messageId);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
