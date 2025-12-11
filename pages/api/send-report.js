import nodemailer from 'nodemailer';
import { generatePdf } from '../../utils/pdfTemplate';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('📩 Anfrage empfangen:', req.body);

  const {
    firstName,
    lastName,
    email,
  } = req.body;

  if (!email) {
    console.error('❌ Kein Empfänger angegeben.');
    return res.status(400).json({ success: false, error: 'Empfängeradresse fehlt' });
  }

  try {
    // 1) PDF-Dokument erzeugen (PDFKit-Stream)
    const pdfDoc = generatePdf(req.body);

    // 2) Stream in Buffer sammeln
    const chunks = [];
    const pdfBuffer = await new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => {
        const buf = Buffer.concat(chunks);
        console.log('📄 PDF erstellt. Größe:', buf.length);
        resolve(buf);
      });
      pdfDoc.on('error', (err) => {
        console.error('❌ Fehler beim PDF-Stream:', err);
        reject(err);
      });
    });

    // 3) Mail-Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'olaf.kunz@aleno.me',
        pass: 'harz asec nrax kuuj', // Hinweis: besser ENV-Variable nehmen :)
      },
    });

    // 4) E-Mail mit PDF verschicken
    await transporter.sendMail({
      from: '"No-Show Report" <olaf.kunz@aleno.me>',
      to: email,
      cc: ['marketing@aleno.me'],
      subject: 'Dein No-Show-Report',
      text: `Hallo ${firstName || ''} ${lastName || ''},

im Anhang findest du deinen No-Show-Report.

Wenn du verlässliche Buchungen erhalten und obendrein deine Umsätze deutlich steigern möchtest, dann lass dir zeigen, was mit aleno möglich ist.

Buche hier eine kostenlose Online-Demo: https://www.aleno.me/de/demo.

Herzlichen Gruss
Olaf`,
      attachments: [
        {
          filename: 'no-show-report.pdf',
          content: pdfBuffer,
        },
      ],
    });

    console.log('📬 Mail erfolgreich an', email, 'versendet.');
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Versand/PDF:', err);
    return res.status(500).json({ success: false, error: err.message || 'Unbekannter Fehler' });
  }
}
