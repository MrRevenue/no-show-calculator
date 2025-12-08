
import nodemailer from 'nodemailer';
import { PassThrough } from 'stream';
import { generatePdf } from '../../utils/pdfTemplate';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log("📩 Anfrage empfangen:", req.body);

  const {
    firstName, lastName, email, mobile,
    country, restaurantType, seats, guestsPerDay,
    openDays, guestReservationRate, averageSpend,
    noShowGuestsLast30Days, hasOnlineReservation,
    reservationTool, reservationRate, feeForNoShow,
    noShowFee, waitlist
  } = req.body;

  if (!email) {
    console.error("❌ Kein Empfänger angegeben.");
    return res.status(400).json({ success: false, error: 'Empfängeradresse fehlt' });
  }

  try {
    const doc = generatePdf(req.body);
    const buffer = [];

    const stream = doc.pipe(new PassThrough());
    stream.on('data', chunk => buffer.push(chunk));
    stream.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffer);
      console.log("📄 PDF erstellt. Größe:", pdfBuffer.length);

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'olaf.kunz@aleno.me',
          pass: 'harz asec nrax kuuj'
        }
      });

      try {
        await transporter.sendMail({
          from: '"No-Show Report" <olaf.kunz@aleno.me>',
          to: email,
          cc: ['marketing@aleno.me'],
          subject: 'Dein No-Show-Report',
          text: `Hallo ${firstName},

im Anhang findest du deinen No-Show-Report.

Wenn du verlässliche Buchungen erhalten und obendrein deine Umsätze deutlich steigern möchtest, dann lass dir zeigen, was mit aleno möglich ist.

Buche hier eine kostenlose Online-Demo: https://www.aleno.me/de/demo.

Herzlichen Gruss
Olaf`,
          attachments: [
            {
              filename: 'no-show-report.pdf',
              content: pdfBuffer
            }
          ]
        });

        console.log("📬 Mail erfolgreich an", email, "versendet.");
        return res.status(200).json({ success: true });

      } catch (sendErr) {
        console.error("❌ Fehler beim Versand:", sendErr);
        return res.status(500).json({ success: false, error: sendErr.message });
      }
    });

  } catch (err) {
    console.error("❌ Allgemeiner Fehler:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
