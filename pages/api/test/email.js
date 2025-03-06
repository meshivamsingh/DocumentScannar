const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, subject, text } = req.body;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
    });

    res.status(200).json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("Email test error:", error);
    res
      .status(500)
      .json({ error: "Failed to send test email", details: error.message });
  }
}
