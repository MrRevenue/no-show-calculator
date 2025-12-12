import nodemailer from 'nodemailer';
import { PassThrough } from 'stream';
import { generatePdf } from '../../utils/pdfTemplate';

function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (c) => chunks.push(c));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, firstName } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Empfängeradresse fehlt' });

    // 1) PDF erzeugen -> Buffer
    const doc = generatePdf(req.body);

    const pass = new PassThrough();
    doc.pipe(pass);

    // Wichtig: PDF wirklich finalisieren
    doc.end();

    const pdfBuffer = await streamToBuffer(pass);

    // 2) Mail senden
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,          // <-- in Vercel setzen
        pass: process.env.GMAIL_APP_PASSWORD  // <-- in Vercel setzen (App Password)
      }
    });

    await transporter.sendMail({
      from: `"No-Show Report" <${process.env.GMAIL_USER}>`,
      to: String(email).trim(),
      cc: 'marketing@aleno.me',
      subject: 'Dein No-Show-Report',
      text: `Hallo ${firstName || ''},

im Anhang findest du deinen No-Show-Report.

Buche hier eine kostenlose Online-Demo: https://www.aleno.me/de/demo.

Herzlichen Gruss
Olaf`,
      attachments: [
        { filename: 'no-show-report.pdf', content: pdfBuffer }
      ]
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Versand/PDF:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || String(err)
    });
  }
}
