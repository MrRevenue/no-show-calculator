import PDFDocument from 'pdfkit';

export function generatePdf(formData) {
  const doc = new PDFDocument({ margin: 50 });

  const get = (key) => formData[key] || '–';

  // ------------------ Farb- & Layout-Definitionen ------------------
  const colorDark = '#111827';   // dunkler Hintergrund / Anlehnung Whitepaper
  const colorBlack = '#000000';
  const colorPink = '#ff2e92';
  const colorText = '#111827';

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // ------------------ Berechnete Werte aus Frontend ------------------
  const calculated = formData.calculated || {};

  const rawNoShowRate =
    typeof calculated.noShowRate === 'number'
      ? calculated.noShowRate
      : Number(calculated.noShowRate || 0);

  const noShowRate = Number.isFinite(rawNoShowRate)
    ? rawNoShowRate.toFixed(1)
    : '0.0';

  const loss30 =
    typeof calculated.loss30 === 'number'
      ? calculated.loss30
      : Number(calculated.loss30 || 0);

  const totalRevenue30 =
    typeof calculated.totalRevenue30 === 'number'
      ? calculated.totalRevenue30
      : Number(calculated.totalRevenue30 || 0);

  const totalGuests30 =
    typeof calculated.totalGuests30 === 'number'
      ? calculated.totalGuests30
      : Number(calculated.totalGuests30 || 0);

  const noShowGuests30 =
    typeof calculated.noShowGuests30 === 'number'
      ? calculated.noShowGuests30
      : Number(calculated.noShowGuests30 || 0);

  const currency =
    formData.country === 'Schweiz' ||
    formData.country === 'Switzerland' ||
    formData.currency === 'CHF'
      ? 'CHF'
      : '€';

  const formatCurrency = (val) =>
    Math.round(Number(val || 0)).toLocaleString('de-DE');

  const restaurantName =
    get('restaurantName') !== '–' ? get('restaurantName') : 'dein Restaurant';

  // ------------------ Vergleichs-Szenario "mit aleno" ------------------
  // aktuelle Situation: Verlust durch No-Shows
  const currentLoss = Math.max(loss30, 0);

  // angenommene No-Show-Rate mit aleno: 0,3 % (0.003)
  const targetNoShowRateDecimal = 0.003;

  // Verlust bei 0,3 % No-Show über den Gesamtumsatz approximiert
  const lossAt0_3 =
    totalRevenue30 > 0
      ? totalRevenue30 * targetNoShowRateDecimal
      : 0;

  const avoidableLoss = Math.max(currentLoss - lossAt0_3, 0);

  // heutiger realisierter Umsatz (vereinfacht: Potenzial minus Verlust)
  const revenueToday = Math.max(totalRevenue30 - currentLoss, 0);

  // Umsatz mit aleno bei 0,3 % No-Shows
  const revenueWithAlenoBase = Math.max(totalRevenue30 - lossAt0_3, 0);

  // 15 % zusätzlicher Upside auf Basis des aleno-Szenarios
  const extraUpside15 = revenueWithAlenoBase * 0.15;
  const revenueWithAlenoPlus15 = revenueWithAlenoBase + extraUpside15;

  // ------------------ Bedingungen für Vergleichskacheln ------------------
  const hasOnline = get('hasOnlineReservation');
  const reservationToolRaw = get('reservationTool');
  const reservationTool =
    typeof reservationToolRaw === 'string'
      ? reservationToolRaw.toLowerCase()
      : '';

  const usesAleno =
    hasOnline === 'Ja' &&
    reservationTool.replace(/\s+/g, '').includes('aleno');

  const showComparisonTiles = !usesAleno && totalRevenue30 > 0;

  // -----------------------------------------------------------------------
  // 1. Kopfbereich mit Titel
  // -----------------------------------------------------------------------
  doc
    .fontSize(22)
    .fillColor(colorDark)
    .text(`No-Show-Report für ${restaurantName}`, {
      align: 'left'
    });

  doc.moveDown(0.4);
  doc
    .fontSize(11)
    .fillColor('#4b5563')
    .text(
      'Basierend auf deinen Angaben haben wir deine No-Show-Quote und den Umsatzverlust durch nicht erschienene Gäste für die letzten 30 Tage berechnet.',
      { align: 'left' }
    );

  doc.moveDown(1);

  // -----------------------------------------------------------------------
  // 2. KPI-Zeile – zwei schwarze Kacheln (wie im Online-Rechner)
  // -----------------------------------------------------------------------
  const kpiBoxGap = 16;
  const kpiBoxWidth = (contentWidth - kpiBoxGap) / 2;
  const kpiBoxHeight = 70;
  const kpiXLeft = marginLeft;
  const kpiXRight = marginLeft + kpiBoxWidth + kpiBoxGap;
  const kpiY = doc.y + 5;

  // Kachel 1: No-Show-Rate
  doc
    .save()
    .roundedRect(kpiXLeft, kpiY, kpiBoxWidth, kpiBoxHeight, 8)
    .fill(colorBlack);

  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .text('No-Show-Rate (30 Tage)', kpiXLeft + 14, kpiY + 12, {
      width: kpiBoxWidth - 28
    });

  doc
    .fontSize(22)
    .text(`${noShowRate} %`, kpiXLeft + 14, kpiY + 32, {
      width: kpiBoxWidth - 28
    })
    .restore();

  // Kachel 2: Umsatzverlust
  doc
    .save()
    .roundedRect(kpiXRight, kpiY, kpiBoxWidth, kpiBoxHeight, 8)
    .fill(colorBlack);

  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .text('Umsatzverlust durch No-Shows (30 Tage)', kpiXRight + 14, kpiY + 12, {
      width: kpiBoxWidth - 28
    });

  doc
    .fontSize(22)
    .text(
      `${formatCurrency(currentLoss)} ${currency}`,
      kpiXRight + 14,
      kpiY + 32,
      {
        width: kpiBoxWidth - 28
      }
    )
    .restore();

  // Cursor unterhalb der Kacheln positionieren
  doc.y = kpiY + kpiBoxHeight + 24;

  // -----------------------------------------------------------------------
  // 3. Potenzial-Vergleich "Heute" vs. "Mit aleno"
  // -----------------------------------------------------------------------
  if (showComparisonTiles) {
    doc
      .fontSize(14)
      .fillColor(colorDark)
      .text('Potenzial für dein Restaurant', { align: 'left' });

    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .fillColor('#4b5563')
      .text(
        'So entwickelt sich dein Reservierungsumsatz, wenn du deine No-Show-Rate auf < 0,3 % senkst und zusätzlich 15 % mehr Umsatz pro reserviertem Gast erzielst.',
        { align: 'left' }
      );

    doc.moveDown(0.8);

    const compBoxGap = 16;
    const compBoxWidth = (contentWidth - compBoxGap) / 2;
    const compBoxHeight = 120;
    const compXLeft = marginLeft;
    const compXRight = marginLeft + compBoxWidth + compBoxGap;
    const compY = doc.y;

    // Linke Kachel: Heute (schwarz / dunkel)
    doc
      .save()
      .roundedRect(compXLeft, compY, compBoxWidth, compBoxHeight, 10)
      .fill(colorDark);

    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text('Heute (bei dir aktuell)', compXLeft + 16, compY + 14, {
        width: compBoxWidth - 32
      });

    doc
      .fontSize(11)
      .text(
        `No-Show-Quote: ${noShowRate} %`,
        compXLeft + 16,
        compY + 36,
        { width: compBoxWidth - 32 }
      );
    doc
      .text(
        `Gesamtumsatz mit Reservierungen (30 Tage):`,
        compXLeft + 16,
        compY + 54,
        { width: compBoxWidth - 32 }
      );
    doc
      .fontSize(14)
      .text(
        `${formatCurrency(totalRevenue30)} ${currency}`,
        compXLeft + 16,
        compY + 72,
        { width: compBoxWidth - 32 }
      );

    doc.restore();

    // Rechte Kachel: Mit aleno (pink)
    doc
      .save()
      .roundedRect(compXRight, compY, compBoxWidth, compBoxHeight, 10)
      .fill(colorPink);

    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text('Mit aleno', compXRight + 16, compY + 14, {
        width: compBoxWidth - 32
      });

    doc
      .fontSize(11)
      .text(
        'No-Show-Quote: < 0,3 %',
        compXRight + 16,
        compY + 36,
        { width: compBoxWidth - 32 }
      );

    doc
      .text(
        'Gesamtumsatz mit Reservierungen (30 Tage):',
        compXRight + 16,
        compY + 54,
        { width: compBoxWidth - 32 }
      );

    doc
      .fontSize(14)
      .text(
        `${formatCurrency(revenueWithAlenoPlus15)} ${currency}`,
        compXRight + 16,
        compY + 72,
        { width: compBoxWidth - 32 }
      );

    const avoidable = formatCurrency(avoidableLoss);
    const extra = formatCurrency(extraUpside15);

    doc
      .fontSize(9)
      .text(
        `davon ca. ${avoidable} ${currency} weniger No-Show-Verlust und ${extra} ${currency} zusätzliches Umsatzpotenzial`,
        compXRight + 16,
        compY + 94,
        { width: compBoxWidth - 32 }
      );

    doc.restore();

    doc.y = compY + compBoxHeight + 24;
  } else {
    // Falls bereits aleno im Einsatz ist
    doc.moveDown(0.8);
    doc
      .fontSize(11)
      .fillColor('#4b5563')
      .text(
        'Du setzt bereits ein professionelles Reservierungs- und Gästemanagement-System ein. Mit aleno lassen sich No-Shows typischerweise auf rund 1,2 % senken – mit No-Show-Gebühr sogar auf etwa 0,4 %.'
      );
    doc.moveDown(1);
  }

  // -----------------------------------------------------------------------
  // 4. Benchmark D / CH / AT
  // -----------------------------------------------------------------------
  doc
    .fontSize(14)
    .fillColor(colorDark)
    .text('So schneiden andere Restaurants ab', {
      align: 'left'
    });

  doc.moveDown(0.4);
  doc
    .fontSize(10)
    .fillColor('#4b5563')
    .text(
      'In vielen Restaurants ohne modernes Reservierungssystem liegen No-Show-Raten im Bereich von 10–20 %, je nach Lage und Zielgruppe.',
      { align: 'left' }
    );

  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .fillColor(colorText)
    .text('Typische Spannweiten der No-Show-Rate ohne Reservierungssystem:');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#4b5563');
  doc.text('• Deutschland: ca. 15–18 %');
  doc.text('• Schweiz: ca. 12–15 %');
  doc.text('• Österreich: ca. 14–17 %');

  doc.moveDown(0.8);

  // -----------------------------------------------------------------------
  // 5. Konkrete Tipps zur Vermeidung von No-Shows
  // -----------------------------------------------------------------------
  doc
    .fontSize(14)
    .fillColor(colorDark)
    .text('Konkrete Tipps zur Vermeidung von No-Shows', {
      align: 'left'
    });

  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#4b5563');
  doc.text(
    '• Schicke zwei Tage vor der Reservierung eine automatisierte Erinnerung mit der Möglichkeit, online zu stornieren (z. B. bis spätestens 24 Stunden vorher). So kannst du frei werdende Tische noch kurzfristig neu vergeben.'
  );
  doc.moveDown(0.2);
  doc.text(
    '• Setze auf provisorische Reservierungen: Erst nach deiner Bestätigung ist der Tisch wirklich fix. So siehst du in deinem CRM die bisherigen Pro-Kopf-Umsätze und kannst bei hoher Nachfrage Stammgäste oder umsatzstarke Gäste bevorzugen.'
  );
  doc.moveDown(0.2);
  doc.text(
    '• Nutze Ticketing für Events und Specials (z. B. Chef’s Table): Gäste wählen im Reservierungsprozess direkt ihr Menü und bezahlen im Voraus. Damit sicherst du dir die Umsätze, kannst gezielter einkaufen und steigerst die Vorfreude deiner Gäste.'
  );

  doc.moveDown(0.8);

  // -----------------------------------------------------------------------
  // 6. aleno-Block mit CTA – visuell an Whitepaper angelehnt
  // -----------------------------------------------------------------------
  const promoBoxHeight = 90;
  const promoY = Math.min(doc.y, pageHeight - promoBoxHeight - 60); // kleine Sicherheit

  doc
    .save()
    .roundedRect(
      marginLeft,
      promoY,
      contentWidth,
      promoBoxHeight,
      10
    )
    .fill(colorDark);

  const promoInnerX = marginLeft + 18;
  const promoInnerWidth = contentWidth - 36;

  doc
    .fillColor('#ffffff')
    .fontSize(13)
    .text(
      'aleno – der digitale Assistent für Restaurants & Hotels',
      promoInnerX,
      promoY + 14,
      {
        width: promoInnerWidth
      }
    );

  doc
    .fontSize(9.5)
    .text(
      'aleno vereint Reservierungs-, Tisch- und Gästemanagement in einer Plattform. Automatisierte Online-Reservierungen, intelligente Tischplanung und ein zentrales Gästedatenmanagement sorgen für höhere Auslastung und mehr Umsatz – und geben deinem Team wieder Zeit für das Wichtigste: die Gäste.',
      promoInnerX,
      promoY + 34,
      { width: promoInnerWidth }
    );

  // CTA-Button anstelle eines QR-Codes
  const btnWidth = 220;
  const btnHeight = 18;
  const btnX = promoInnerX;
  const btnY = promoY + promoBoxHeight - btnHeight - 10;

  doc
    .roundedRect(btnX, btnY, btnWidth, btnHeight, 9)
    .fill(colorPink);

  doc
    .fillColor('#ffffff')
    .fontSize(9.5)
    .text('Jetzt aleno kostenlos kennenlernen', btnX, btnY + 4, {
      width: btnWidth,
      align: 'center',
      link: 'https://www.aleno.me/de/demo'
    });

  doc.restore();

  // WICHTIG: Stream beenden und zurückgeben
  doc.end();
  return doc;
}