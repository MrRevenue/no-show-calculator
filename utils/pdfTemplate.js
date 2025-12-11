import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export function generatePdf(formData) {
  const doc = new PDFDocument({ margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const get = (key) => formData[key] || '–';

  // --- Berechnete Werte aus dem Frontend übernehmen ---
  const calculated = formData.calculated || {};

  const rawNoShowRate = typeof calculated.noShowRate === 'number'
    ? calculated.noShowRate
    : 0;

  const noShowRate = rawNoShowRate.toFixed
    ? rawNoShowRate.toFixed(1)
    : Number(rawNoShowRate || 0).toFixed(1);

  const loss30 = typeof calculated.loss30 === 'number'
    ? calculated.loss30
    : 0;

  const totalRevenue30 = typeof calculated.totalRevenue30 === 'number'
    ? calculated.totalRevenue30
    : 0;

  const upsell = typeof calculated.upsell === 'number'
    ? calculated.upsell
    : totalRevenue30 * 0.05;

  const roi = typeof calculated.roi === 'number'
    ? calculated.roi
    : Math.floor((loss30 + upsell) / 350);

  const currency = formData.country === 'Schweiz' || formData.country === 'Switzerland'
    ? 'CHF'
    : '€';

  const formatCurrency = (val) =>
    Math.round(Number(val || 0)).toLocaleString('de-DE');

  const restaurantName = get('restaurantName') !== '–'
    ? get('restaurantName')
    : 'dein Restaurant';

  // ---------------------------------------------------------------------------
  // TITEL
  // ---------------------------------------------------------------------------
  doc
    .fontSize(24)
    .fillColor('#000')
    .text(`No-Show-Report für ${restaurantName}`, { align: 'left' });

  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .fillColor('#333')
    .text(
      'Basierend auf deinen Angaben haben wir deine No-Show-Quote und den Umsatzverlust durch nicht erschienene Gäste für die letzten 30 Tage geschätzt.',
      { align: 'left' }
    );

  doc.moveDown(1.5);

  // ---------------------------------------------------------------------------
  // 1. DEINE KENNZAHLEN (30 TAGE)
  // ---------------------------------------------------------------------------
  doc
    .fontSize(16)
    .fillColor('#000')
    .text('1. Deine Kennzahlen (letzte 30 Tage)', { underline: true });

  doc.moveDown(0.7);
  doc.fontSize(12).fillColor('#333');

  doc.text(`• No-Show-Rate (30 Tage): ${noShowRate} %`);
  doc.text(
    `• Umsatzverlust durch No-Shows (30 Tage): ${formatCurrency(loss30)} ${currency}`
  );

  if (totalRevenue30 > 0) {
    doc.text(
      `• Erwarteter Umsatz mit Reservierungen (30 Tage): ${formatCurrency(
        totalRevenue30
      )} ${currency}`
    );
  }

  doc.moveDown(1.2);

  // ---------------------------------------------------------------------------
  // 2. Einordnung & Benchmark
  // ---------------------------------------------------------------------------
  doc
    .fontSize(16)
    .fillColor('#000')
    .text('2. Einordnung deines Ergebnisses', { underline: true });

  doc.moveDown(0.7);
  doc.fontSize(11).fillColor('#333');

  // Hinweis: Für DACH werden in vielen Quellen No-Show-Raten im Bereich 10–20 %,
  // teilweise bis 30 % und mehr angegeben – vor allem ohne professionelle Systeme.
  doc.text(
    'In vielen Restaurants ohne professionelles Reservierungs- und Gästemanagement-System liegen No-Show-Raten typischerweise im Bereich von 10–20 %, an Wochenenden oder in Hotspots teilweise auch darüber.'
  );
  doc.moveDown(0.4);
  doc.text(
    'Liegt deine No-Show-Rate deutlich in diesem Bereich oder darüber, hast du ein erhebliches Potenzial, Umsatzverluste zu reduzieren und deine Planung zu verbessern.'
  );

  doc.moveDown(1.2);

  // ---------------------------------------------------------------------------
  // 3. No-Show-Rate mit moderner Software / aleno
  // ---------------------------------------------------------------------------
  doc
    .fontSize(16)
    .fillColor('#000')
    .text('3. Was mit moderner Reservierungssoftware möglich ist', {
      underline: true
    });

  doc.moveDown(0.7);
  doc.fontSize(11).fillColor('#333');

  doc.text(
    'Mit einer modernen Reservierungs- und Gästemanagement-Software lässt sich die No-Show-Rate massiv senken. Auswertungen von über 2 500 Restaurants, die aleno nutzen, zeigen:'
  );
  doc.moveDown(0.4);
  doc.text('• Ø No-Show-Rate mit digitalem Assistenten: ca. 1,2 %');
  doc.text(
    '• Ø No-Show-Rate mit zusätzlicher No-Show-Gebühr: ca. 0,4 %'
  );
  doc.moveDown(0.4);
  doc.text(
    'Diese Werte basieren auf 46 076 180 über aleno getätigten Reservierungen und 169 653 246 platzierten Gästen im Jahr 2025.'
  );

  doc.moveDown(1.2);

  // ---------------------------------------------------------------------------
  // 4. Konkrete Tipps zur Reduktion von No-Shows
  // ---------------------------------------------------------------------------
  doc
    .fontSize(16)
    .fillColor('#000')
    .text('4. Konkrete Tipps zur Vermeidung von No-Shows', {
      underline: true
    });

  doc.moveDown(0.7);
  doc.fontSize(11).fillColor('#333');

  doc.text(
    '• Schicke zwei Tage vor der Reservierung eine automatisierte Erinnerung mit der Möglichkeit, online zu stornieren (z. B. bis spätestens 24 Stunden vorher). So kannst du frei werdende Tische noch kurzfristig an andere Gäste vergeben.'
  );
  doc.moveDown(0.4);
  doc.text(
    '• Setze auf provisorische Reservierungen: Erst nach deiner Bestätigung ist der Tisch wirklich fix. So kannst du in deinem CRM sehen, wie hoch die bisherigen Pro-Kopf-Umsätze der reservierenden Person waren und bei hoher Nachfrage gezielt Stammgäste oder umsatzstarke Gäste bevorzugen.'
  );
  doc.moveDown(0.4);
  doc.text(
    '• Nutze Ticketing für Events und Specials (z. B. Chef’s Table): Gäste wählen im Reservierungsprozess direkt ihr Menü (z. B. 3-, 4- oder 5-Gang, Fleisch oder vegetarisch, mit Wein- oder Saftbegleitung) und bezahlen im Voraus. Damit sicherst du dir die Umsätze, kannst gezielter einkaufen und vorbereiten und steigerst gleichzeitig die Vorfreude deiner Gäste.'
  );

  doc.moveDown(1.2);

  // ---------------------------------------------------------------------------
  // 5. Kurzvorstellung aleno & Call-to-Action
  // ---------------------------------------------------------------------------
  doc
    .fontSize(16)
    .fillColor('#000')
    .text('5. Wer ist aleno?', { underline: true });

  doc.moveDown(0.7);
  doc.fontSize(11).fillColor('#333');

  doc.text(
    'aleno ist der digitale Assistent für Restaurants und Hotels. Die Plattform vereint Reservierungs-, Tisch- und Gästemanagement in einem System. Automatisierte Online-Reservierungen, intelligente Tischplanung und ein zentrales Gästedatenmanagement sorgen für höhere Auslastung und mehr Umsatz – und geben deinen Teams wieder Zeit für das Wichtigste: die Gäste.'
  );

  doc.moveDown(0.6);
  doc
    .fillColor('#0077cc')
    .text('→ Jetzt aleno kostenlos kennenlernen', {
      link: 'https://www.aleno.me/de/demo'
    });

  doc.moveDown(1.5);

  // ---------------------------------------------------------------------------
  // 6. Zusammenfassung deiner wichtigsten Angaben
  // (kompakt gehalten, um auf einer Seite zu bleiben)
  // ---------------------------------------------------------------------------
  doc
    .fontSize(14)
    .fillColor('#000')
    .text('Zusammenfassung deiner Angaben', { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333');

  const labels = {
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    country: 'Land',
    restaurantName: 'Name des Restaurants',
    restaurantType: 'Restaurant-Typ',
    reservationsPerDay: 'Ø Reservierungen pro Öffnungstag',
    avgGuestsPerReservation: 'Ø Gäste pro Reservierung',
    openDays: 'Tage pro Woche geöffnet',
    averageSpend: 'Ø Umsatz pro Gast',
    noShowGuestsLast30Days: 'No-Shows (Personen, letzte 30 Tage)',
    hasOnlineReservation: 'Online-Reservierungssystem im Einsatz',
    reservationTool: 'Aktuelles Reservierungssystem',
    feeForNoShow: 'No-Show-Gebühren erhoben',
    noShowFee: 'No-Show-Gebühr pro Gast'
  };

  Object.entries(labels).forEach(([key, label]) => {
    const value = formData[key];
    if (value !== undefined) {
      doc.text(`${label}: ${value || '–'}`);
    }
  });

  doc.end();
  return doc;
}
