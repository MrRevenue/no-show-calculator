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
    const body = req.body || {};
    const email = String(body.email || '').trim();
    const firstName = body.firstName || '';

    if (!email) {
      return res.status(400).json({ success: false, error: 'Empfängeradresse fehlt' });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    console.log('ENV CHECK', {
  hasUser: Boolean(process.env.GMAIL_USER),
  hasPass: Boolean(process.env.GMAIL_APP_PASSWORD),
});


    if (!gmailUser || !gmailPass) {
      console.error('❌ Missing ENV:', {
        hasUser: Boolean(gmailUser),
        hasPass: Boolean(gmailPass),
      });
      return res.status(500).json({
        success: false,
        error: 'Server-Konfiguration fehlt (GMAIL_USER / GMAIL_APP_PASSWORD).',
      });
    }

    // PDF erzeugen (WICHTIG: pdfTemplate.js darf NICHT doc.pipe() machen)
    const doc = generatePdf(body);

    // in Buffer streamen
    const pass = new PassThrough();
    doc.pipe(pass);

    const pdfBuffer = await streamToBuffer(pass);

    // Mail versenden
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"No-Show Report" <${gmailUser}>`,
      to: email,
      cc: 'marketing@aleno.me',
      subject: 'Dein No-Show-Report',
      text: `Hallo ${firstName},

im Anhang findest du deinen No-Show-Report.

Buche hier eine kostenlose Online-Demo: https://www.aleno.me/de/demo

Herzlichen Gruss
Olaf`,
      attachments: [
        {
          filename: 'no-show-report.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Versand/PDF:', err);
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
}
