
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export function generatePdf(formData) {
  const doc = new PDFDocument({ margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const get = (key) => formData[key] || '–';
  const guests = +formData.guestsPerDay || 0;
  const open = +formData.openDays || 0;
  const rate = +formData.guestReservationRate || 0;
  const spend = +formData.averageSpend || 0;
  const noshows = +formData.noShowGuestsLast30Days || 0;
  const fee = +formData.noShowFee || 0;
  const monthlyGuests = guests * open * 4.35;
  const totalRes = monthlyGuests * (rate / 100);
  const noshowRate = totalRes > 0 ? Math.max((noshows / totalRes) * 100 - 0.3, 0).toFixed(1) : '0.0';
  const loss = Math.max((noshows * spend) - (noshows * fee), 0);
  const revenue = monthlyGuests * spend;
  const upsell = revenue * 0.05;
  const roi = Math.floor((loss + upsell) / 350);
  const currency = formData.country === 'Schweiz' ? 'CHF' : 'EUR';

  doc.fontSize(24).fillColor('#000').text('No-Show-Rechner', { align: 'left' });
  doc.moveDown();
  doc.fontSize(18).text('Deine Auswertung', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);
  doc.text(`No-Show-Rate (mtl.): ${noshowRate} %`);
  doc.text(`No-Show-Umsatzverlust (mtl.): ${Math.round(loss)} ${currency}`);
  doc.text(`Ø Auslastung (30 Tage): ${((monthlyGuests / (+formData.seats || 1)) * 100).toFixed(1)} %`);
  doc.text(`Gesamtumsatz (30 Tage): ${Math.round(revenue).toLocaleString()} ${currency}`);
  doc.moveDown(1.5);

  doc.fontSize(16).text('Dein Optimierungspotenzial', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);
  doc.text('No-Show-Rate: 0 %');
  doc.text(`Zusätzlicher Umsatz ohne No-Shows: ${Math.round(loss)} ${currency}`);
  doc.text(`Umsatzsteigerung durch personalisiertes Upselling: ${Math.round(upsell)} ${currency}`);
  doc.text(`Return on Investment beim Einsatz von aleno: ${roi}-fach (mindestens)`);
  doc.moveDown(1.5);

  doc.fontSize(16).text('Individuelle Tipps zur Optimierung für dich', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  if (get('feeForNoShow') === 'Nein') {
    doc.text('• Mit aleno kannst du Kreditkarten vorautorisieren für mögliche No-Show-Gebühr-Abbuchungen.');
  }
  if (get('feeForNoShow') === 'Ja') {
    doc.text('• Mit aleno kannst du Stammgäste und VIPs automatisch von der Kreditkartenabfrage befreien.');
  }
  doc.text('• Auch ohne Gebühr kannst du No-Shows mit aleno stark senken. Durchschnitt: nur 0,5 %.');
  doc.text('• Für Events (Valentinstag etc.) kannst du mit aleno Menüs verkaufen – keine No-Shows, kein Wareneinsatzverlust.');
  doc.text('• Konsumationsdaten fließen ins 360°-Gästeprofil. So gelingt echtes Upselling.');
  doc.text('• aleno ist keine Ausgabe, sondern eine Investition – mit messbarem ROI.');
  doc.moveDown();
  doc.fillColor('#0077cc').text('→ Jetzt kostenlose Online-Demo vereinbaren', {
    link: 'https://www.aleno.me/de/demo'
  });

  doc.moveDown(2);
  doc.fillColor('black').fontSize(16).text('Zusammenfassung deiner Angaben', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  const labels = {'firstName': 'Vorname', 'lastName': 'Nachname', 'email': 'E-Mail', 'mobile': 'Mobilnummer', 'country': 'Land', 'restaurantType': 'Restaurant-Typ', 'seats': 'Anzahl Sitzplätze', 'guestsPerDay': 'Ø Gäste pro Öffnungstag', 'openDays': 'Tage pro Woche geöffnet', 'guestReservationRate': '% Gäste mit Reservierung', 'averageSpend': 'Ø Umsatz pro Gast', 'noShowGuestsLast30Days': 'No-Shows (letzte 30 Tage)', 'hasOnlineReservation': 'Online-Reservierungssystem im Einsatz', 'reservationTool': 'Reservierungssystem', 'reservationRate': '% Reservierungen online', 'feeForNoShow': 'No-Show-Gebühren erhoben', 'noShowFee': 'No-Show-Gebühr pro Gast', 'waitlist': 'Warteliste vorhanden'};
  Object.entries(formData).forEach(([key, value]) => {
    if (labels[key]) {
      doc.text(`${labels[key]}: ${value || '–'}`);
    }
  });

  doc.end();
  return doc;
}
