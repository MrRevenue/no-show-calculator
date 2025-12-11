import PDFDocument from 'pdfkit';

export function generatePdf(formData) {
  const doc = new PDFDocument({ margin: 50 });

  const get = (key) => formData[key] || '–';

  const colorDark = '#111827';
  const colorBlack = '#000000';
  const colorPink = '#ff2e92';
  const colorText = '#111827';

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;
  const contentWidth = pageWidth - marginLeft - marginRight;

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

  // Vergleichs-Szenario
  const currentLoss = Math.max(loss30, 0);
  const targetNoShowRateDecimal = 0.003;

  const lossAt0_3 =
    totalRevenue30 > 0 ? totalRevenue30 * targetNoShowRateDecimal : 0;

  const avoidableLoss = Math.max(currentLoss - lossAt0_3, 0);
  const revenueToday = Math.max(totalRevenue30 - currentLoss, 0);
  const revenueWithAlenoBase = Math.max(totalRevenue30 - lossAt0_3, 0);
  const extraUpside15 = revenueWithAlenoBase * 0.15;
  const revenueWithAlenoPlus15 = revenueWithAlenoBase + extraUpside15;

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

  // ---------------- TITEL ----------------
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

  // ---------------- KPI-KACHELN ----------------
  const kpiBoxGap = 16;
  const kpiBoxWidth = (contentWidth - kpiBoxGap) / 2;
  const kpiBoxHeight = 70;
  const kpiXLeft = marginLeft;
  const kpiXRight = marginLeft + kpiBoxWidth + kpiBoxGap;
  const kpiY = doc.y + 5;

  // Achtung: pdfkit heißt roundedRect, nicht roundedRectangle!
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

  doc
    .save()
    .roundedRect(kpiXRight, kpiY, kpiBoxWidth, kpiBoxHeight, 8)
    .fill(colorBlack);

  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .text(
      'Umsatzverlust durch No-Shows (30 Tage)',
      kpiXRight + 14,
      kpiY + 12,
      {
        width: kpiBoxWidth - 28
      }
    );

  doc
    .fontSize(22)
    .text(`${formatCurrency(currentLoss)} ${currency}`, kpiXRight + 14, kpiY + 32, {
      width: kpiBoxWidth - 28
    })
    .restore();

  doc.y = kpiY + kpiBoxHeight + 24;

  // ---------------- Vergleichskacheln ----------------
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

    // Heute
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
    doc.text(
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

    // Mit aleno
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

    doc.text(
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
  }

  // ... (Benchmark, Tipps, aleno-Box, Zusammenfassung wie vorher – hier kannst du
  // meinen letzten Vorschlag weiterverwenden, nur überall `roundedRect` statt
  // `roundedRectangle` benutzen und KEINE Streams im pdfTemplate selbst.)

  doc.end();
  return doc;
}
