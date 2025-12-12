// pages/api/send-report.js
import nodemailer from 'nodemailer';
import { PassThrough } from 'stream';
import { generatePdf } from '../../utils/pdfTemplate';

console.log('SEND-REPORT LOADED', __filename);

function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (c) => chunks.push(c));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const email = String(body.email || '').trim();
    const firstName = String(body.firstName || '').trim();

    if (!email) {
      return res.status(400).json({ success: false, error: 'Empfängeradresse fehlt' });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    console.log('ENV CHECK', { hasUser: Boolean(gmailUser), hasPass: Boolean(gmailPass) });

    if (!gmailUser || !gmailPass) {
      console.error('❌ Missing ENV vars (GMAIL_USER / GMAIL_APP_PASSWORD)');
      return res.status(500).json({
        success: false,
        error: 'Server-Konfiguration fehlt (GMAIL_USER / GMAIL_APP_PASSWORD).',
      });
    }

    // ---------- PDF erzeugen ----------
    const doc = generatePdf(body);

    // Wichtig: pdfTemplate.js darf NICHT doc.pipe() machen.
    // Wichtig: doc.end() MUSS hier passieren, wenn pdfTemplate.js es nicht macht.
    const pass = new PassThrough();
    doc.pipe(pass);
    doc.end();

    const pdfBuffer = await streamToBuffer(pass);

    console.log('PDF BUFFER SIZE', pdfBuffer?.length || 0);

    // ---------- Mail versenden ----------
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"No-Show Report" <${gmailUser}>`,
      to: email,
      cc: 'marketing@aleno.me',
      subject: 'Dein No-Show-Report',
      text: `Hallo ${firstName || ''},

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

    console.log('MAIL SENT OK ->', email);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Versand/PDF:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
}
