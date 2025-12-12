console.log('SEND-REPORT LOADED');

import nodemailer from 'nodemailer';
import { PassThrough } from 'stream';
import { generatePdf } from '../../utils/pdfTemplate';

/**
 * Stream → Buffer helper
 */
function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  // --------------------------------------------------
  // METHOD CHECK
  // --------------------------------------------------
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // --------------------------------------------------
    // REQUEST DATA
    // --------------------------------------------------
    const body = req.body || {};
    const email = String(body.email || '').trim();
    const firstName = String(body.firstName || '').trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Empfängeradresse fehlt',
      });
    }

    // --------------------------------------------------
    // ENV CHECK
    // --------------------------------------------------
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    console.log('ENV CHECK', {
      hasUser: Boolean(gmailUser),
      hasPass: Boolean(gmailPass),
    });

    if (!gmailUser || !gmailPass) {
      console.error('❌ Missing ENV', {
        hasUser: Boolean(gmailUser),
        hasPass: Boolean(gmailPass),
      });

      return res.status(500).json({
        success: false,
        error:
          'Server-Konfiguration fehlt (GMAIL_USER / GMAIL_APP_PASSWORD).',
      });
    }

    // --------------------------------------------------
    // PDF GENERATION
    // --------------------------------------------------
    const doc = generatePdf(body);

    const pass = new PassThrough();

    doc.on('error', (err) => {
      console.error('❌ PDFKIT ERROR', err);
    });

    pass.on('error', (err) => {
      console.error('❌ STREAM ERROR', err);
    });

    doc.pipe(pass);

    // ✅ CRITICAL FIX:
    // nur beenden, wenn noch nicht beendet
    if (!doc._ended && !doc._ending) {
      doc.end();
    }

    const pdfBuffer = await streamToBuffer(pass);

    if (!pdfBuffer || !pdfBuffer.length) {
      throw new Error('PDF Buffer leer');
    }

    // --------------------------------------------------
    // MAIL TRANSPORT
    // --------------------------------------------------
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // --------------------------------------------------
    // SEND MAIL
    // --------------------------------------------------
    await transporter.sendMail({
      from: `"No-Show Report" <${gmailUser}>`,
      to: email,
      cc: 'marketing@aleno.me',
      subject: 'Dein No-Show-Report',
      text: `Hallo ${firstName || ''},

im Anhang findest du deinen No-Show-Report.

Buche hier eine kostenlose Online-Demo:
https://www.aleno.me/de/demo

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

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Versand/PDF:', err);

    return res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
}