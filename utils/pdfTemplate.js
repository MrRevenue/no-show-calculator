import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const BRUSH_WHITE = path.join(process.cwd(), 'public', 'brush-white.png');

export function generatePdf(formData) {
  // A4 quer – Cover Full-Bleed (margin 0), Content-Seiten später margin 50
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0
  });

  // ------------------ Fonts (Poppins) ------------------
  const FONT_LIGHT = path.join(process.cwd(), 'public', 'fonts', 'Poppins-Light.ttf');
  const FONT_REGULAR = path.join(process.cwd(), 'public', 'fonts', 'Poppins-Regular.ttf');
  const FONT_SEMIBOLD = path.join(process.cwd(), 'public', 'fonts', 'Poppins-SemiBold.ttf');
  const FONT_BOLD = path.join(process.cwd(), 'public', 'fonts', 'Poppins-Bold.ttf');

  doc.registerFont('Poppins-Light', FONT_LIGHT);
  doc.registerFont('Poppins', FONT_REGULAR);
  doc.registerFont('Poppins-SemiBold', FONT_SEMIBOLD);
  doc.registerFont('Poppins-Bold', FONT_BOLD);

  doc.font('Poppins-Light');

  // ------------------ Safety Helpers ------------------
  const safeStr = (v, fallback = '') => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
      return String(v);
    } catch {
      return fallback;
    }
  };

  const safeArr = (v) => (Array.isArray(v) ? v : []);

  const isFilled = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim() !== '' && v.trim() !== '-';
    return true;
  };

  const get = (key) => {
    const v = formData?.[key];
    return v === null || v === undefined || v === '' ? '-' : v;
  };

  // ------------------ Farben ------------------
  const COLOR_DARK = '#282731';
  const COLOR_PINK = '#ff2e92';
  const COLOR_WHITE = '#ffffff';

  const COLOR_GRAY = '#4b5563';
  const COLOR_SUB = '#d1d5db';

  // Währung (Frontend nutzt aktuell fix €; wir lassen Logik kompatibel)
  const currency =
    formData?.country === 'Schweiz' ||
    formData?.country === 'Switzerland' ||
    formData?.currency === 'CHF'
      ? 'CHF'
      : '€';

  const formatCurrency = (val) => Math.round(Number(val || 0)).toLocaleString('de-DE');

  // ------------------ Daten aus Frontend-Berechnung ------------------
  const calculated = formData?.calculated || {};

  const noShowRateNum = Number(
    typeof calculated.noShowRate === 'number' ? calculated.noShowRate : calculated.noShowRate || 0
  );
  const noShowRate = Number.isFinite(noShowRateNum) ? noShowRateNum : 0;

  const loss30 = Number(typeof calculated.loss30 === 'number' ? calculated.loss30 : calculated.loss30 || 0);

  const totalRevenue30 = Number(
    typeof calculated.totalRevenue30 === 'number' ? calculated.totalRevenue30 : calculated.totalRevenue30 || 0
  );

  const noShowGuests30 = Number(
    typeof calculated.noShowGuests30 === 'number' ? calculated.noShowGuests30 : calculated.noShowGuests30 || 0
  );

  const avgSpend = Number(formData?.averageSpend || 0);
  const noShowFeePerGuest = formData?.feeForNoShow === 'Ja' ? Number(formData?.noShowFee || 0) : 0;

  // Bruttopotenzial/Verlust-Logik
  const grossLoss30 = Math.max(noShowGuests30 * avgSpend, 0);
  const recoveredByFees30 = Math.max(noShowGuests30 * noShowFeePerGuest, 0);
  const netLoss30 = Math.max(grossLoss30 - recoveredByFees30, 0);

  const revenueActual30 = Math.max(totalRevenue30 - grossLoss30, 0);

  // Zielwerte „mit aleno“
  const TARGET_NOSHOW_RATE = 0.003; // 0.3 %
  const targetGrossLoss = Math.max(totalRevenue30 * TARGET_NOSHOW_RATE, 0);
  const avoidableLossGross = Math.max(grossLoss30 - targetGrossLoss, 0);
  const revenueWithAlenoBase = Math.max(revenueActual30 + avoidableLossGross, 0);
  const extraUpside15 = Math.max(revenueWithAlenoBase * 0.15, 0);

  const restaurantName =
    get('restaurantName') !== '-' && safeStr(get('restaurantName')).trim()
      ? safeStr(get('restaurantName')).trim()
      : 'dein Restaurant';

  // ------------------ Bedingungen für Seite 3 ------------------
  const hasOnline = safeStr(get('hasOnlineReservation'), '');
  const reservationToolRaw = safeStr(get('reservationTool'), '');
  const reservationTool = reservationToolRaw.toLowerCase().replace(/\s+/g, '');
  const usesAleno = hasOnline === 'Ja' && reservationTool.includes('aleno');
  const hasOtherTool = hasOnline === 'Ja' && reservationToolRaw && !usesAleno;

  // ------------------ Assets (/public) ------------------
  const LOGO_IMAGE = path.join(process.cwd(), 'public', 'aleno-new_negativ.png');
  const COVER_IMAGE = path.join(process.cwd(), 'public', 'cover-photo.jpg');

  // =============================================================
  // SEITE 1: TITELSEITE (Full Bleed) – Cover Bild rechts, abgerundet
  // =============================================================
  const coverW = doc.page.width;
  const coverH = doc.page.height;

  doc.rect(0, 0, coverW, coverH).fill(COLOR_DARK);

  if (fs.existsSync(LOGO_IMAGE)) {
    doc.image(LOGO_IMAGE, 55, 45, { width: 150 });
  }

  const fitText = ({
    text,
    x,
    y,
    width,
    maxHeight,
    fontName = 'Poppins-Light',
    maxFontSize = 56,
    minFontSize = 30,
    lineGap = 6,
    color = COLOR_WHITE
  }) => {
    let size = maxFontSize;

    doc.fillColor(color).font(fontName);

    while (size >= minFontSize) {
      doc.fontSize(size);
      const h = doc.heightOfString(text, { width, lineGap });
      if (h <= maxHeight) break;
      size -= 1;
    }

    doc.text(text, x, y, { width, lineGap });
    return size;
  };

  // Bild rechts (abgerundet + vertikal zentriert)
  const rightPad = 45;
  const gapToTitle = 36;
  const imgBoxW = coverW * 0.40;
  const imgBoxH = coverH * 0.68;
  const imgBoxX = coverW - rightPad - imgBoxW;
  const imgBoxY = Math.round((coverH - imgBoxH) / 2);
  const imgRadius = 16;

  if (fs.existsSync(COVER_IMAGE)) {
    doc.save();
    doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, imgRadius).clip();
    doc.image(COVER_IMAGE, imgBoxX, imgBoxY, {
      cover: [imgBoxW, imgBoxH],
      align: 'center',
      valign: 'center'
    });
    doc.restore();
  }

  // Titel links (wie vorher)
  const titleX = 55;
  const titleY = 220;
  const titleW = Math.max(240, imgBoxX - gapToTitle - titleX);
  const titleMaxH = 260;

  const titleText = `No-Show-Report\nfür das Restaurant\n„${restaurantName}“`;

  fitText({
    text: titleText,
    x: titleX,
    y: titleY,
    width: titleW,
    maxHeight: titleMaxH,
    maxFontSize: 42,
    minFontSize: 30,
    lineGap: 6,
    fontName: 'Poppins-Light',
    color: COLOR_WHITE
  });

  doc
    .fillColor(COLOR_SUB)
    .font('Poppins-Light')
    .fontSize(26)
    .text('Zahlen, Vergleiche, Tipps', titleX, coverH - 120, { width: titleW });

  // =============================================================
  // SEITE 2: DEINE ANGABEN (neu, basierend auf index.js Keys)
  // =============================================================
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 50 });

  let pageW = doc.page.width;
  let pageH = doc.page.height;
  let marginL = doc.page.margins.left;
  let marginR = doc.page.margins.right;
  let contentW = pageW - marginL - marginR;

  doc.fillColor(COLOR_DARK).font('Poppins-Light').fontSize(28).text('Deine Angaben', marginL, 50);

  doc
    .fillColor(COLOR_GRAY)
    .font('Poppins-Light')
    .fontSize(14)
    .text('Hier siehst du die Angaben aus dem Formular (ohne Kontaktdaten).', marginL, 92, { width: contentW });

  // Reihenfolge: Restaurant-Name zuerst, dann Rest (wie index.js Fragen)
  const qas = [
    { key: 'restaurantName', q: 'Name des Restaurants' },

    { key: 'reservationsPerDay', q: 'Ø Reservierungen pro Öffnungstag (alle Kanäle)' },
    { key: 'avgGuestsPerReservation', q: 'Ø Gäste pro Reservierung' },
    {
      key: 'noShowGuestsLast30Days',
      q: 'No-Shows: Wie viele Personen sind in den letzten 30 Tagen trotz Reservierung nicht erschienen?'
    },

    { key: 'restaurantType', q: 'Art des Restaurants' },
    { key: 'openDays', q: 'Anzahl Tage pro Woche geöffnet' },
    { key: 'averageSpend', q: `Ø Umsatz pro Gast (${currency})` },

    { key: 'hasOnlineReservation', q: 'Ist ein Online-Reservierungssystem im Einsatz?' },
    { key: 'reservationTool', q: 'Welches Reservierungssystem ist aktuell im Einsatz?' },
    { key: 'feeForNoShow', q: 'Werden No-Show-Gebühren erhoben?' },
    { key: 'noShowFee', q: `Wie hoch ist die No-Show-Gebühr pro Gast (${currency})?` }
  ];

  const formatAnswer = (key, raw) => {
    if (!isFilled(raw)) return null;

    // Zahlenformate / Units
    if (['reservationsPerDay', 'openDays', 'noShowGuestsLast30Days'].includes(key)) {
      const n = Number(raw);
      if (Number.isFinite(n)) return formatCurrency(n);
      return safeStr(raw).trim();
    }

    if (key === 'avgGuestsPerReservation') {
      const n = Number(raw);
      if (Number.isFinite(n)) return String(n).replace('.', ',');
      return safeStr(raw).trim();
    }

    if (key === 'averageSpend' || key === 'noShowFee') {
      const n = Number(raw);
      if (Number.isFinite(n)) return `${formatCurrency(n)} ${currency}`;
      return safeStr(raw).trim();
    }

    return safeStr(raw).trim();
  };

  // Layout: zwei Spalten (Frage links, Antwort rechts)
  const listX = marginL;
  const listY0 = 140;
  const qW = Math.round(contentW * 0.68);
  const aW = contentW - qW;
  const rowGap = 12;

  let y = listY0;

  // Nur beantwortete Fragen — zusätzlich: noShowFee nur, wenn feeForNoShow === 'Ja'
  for (const item of qas) {
    if (['firstName', 'lastName', 'email'].includes(item.key)) continue;
    if (item.key === 'noShowFee' && formData?.feeForNoShow !== 'Ja') continue;

    const raw = get(item.key);
    const ans = formatAnswer(item.key, raw);
    if (!ans) continue;

    doc.font('Poppins-SemiBold').fontSize(13);
    const qH = doc.heightOfString(item.q, { width: qW, lineGap: 2 });

    // Antwort etwas kräftiger, aber nicht "bold"
    doc.font('Poppins').fontSize(13);
    const aH = doc.heightOfString(ans, { width: aW, lineGap: 2 });

    const h = Math.max(qH, aH);

    // Bei Platzmangel: Folgeseite „Deine Angaben“
    if (y + h > pageH - 70) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 50 });

      pageW = doc.page.width;
      pageH = doc.page.height;
      marginL = doc.page.margins.left;
      marginR = doc.page.margins.right;
      contentW = pageW - marginL - marginR;

      y = 90;

      doc
        .fillColor(COLOR_DARK)
        .font('Poppins-Light')
        .fontSize(22)
        .text('Deine Angaben (Fortsetzung)', marginL, 45);
    }

    doc
      .fillColor(COLOR_GRAY)
      .font('Poppins-SemiBold')
      .fontSize(13)
      .text(item.q, listX, y, { width: qW, lineGap: 2 });

    doc
      .fillColor(COLOR_DARK)
      .font('Poppins')
      .fontSize(13)
      .text(ans, listX + qW, y, { width: aW, align: 'right', lineGap: 2 });

    y += h + rowGap;
  }

  // =============================================================
  // Ab jetzt: Content-Seiten (ehemals Seite 2 -> jetzt Seite 3)
  // =============================================================
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 50 });

  pageW = doc.page.width;
  pageH = doc.page.height;
  marginL = doc.page.margins.left;
  marginR = doc.page.margins.right;
  contentW = pageW - marginL - marginR;

  // ------------------ Layout Helpers ------------------
  const drawKpiTile = ({ x, y, w, h, title, value, bg = COLOR_DARK, fg = COLOR_WHITE }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 14).fill(bg);

    doc
      .fillColor(fg)
      .font('Poppins-SemiBold')
      .fontSize(18)
      .text(safeStr(title), x + 24, y + 20, { width: w - 48, align: 'center' });

    doc
      .fillColor(fg)
      .font('Poppins-Bold')
      .fontSize(40)
      .text(safeStr(value), x + 24, y + 58, { width: w - 48, align: 'center' });

    doc.restore();
  };

  const drawOutlineTile = ({ x, y, w, h, title, lines, titleAlign = 'left', linesAlign = 'left' }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 14).lineWidth(2).stroke(COLOR_DARK);

    doc
      .fillColor(COLOR_DARK)
      .font('Poppins-Bold')
      .fontSize(18)
      .text(safeStr(title), x + 22, y + 20, { width: w - 44, align: titleAlign });

    let cy = y + 58;

    for (const ln of safeArr(lines)) {
      if (typeof ln === 'string') {
        doc
          .fillColor(COLOR_GRAY)
          .font('Poppins-Light')
          .fontSize(14)
          .text(safeStr(ln), x + 22, cy, { width: w - 44, align: linesAlign });
        cy += 22;
        continue;
      }

      const text = safeStr(ln?.text);
      const font = safeStr(ln?.font, 'Poppins-Light');
      const size = Number.isFinite(ln?.size) ? ln.size : 14;
      const color = ln?.color || COLOR_GRAY;
      const gap = Number.isFinite(ln?.gap) ? ln.gap : Math.max(6, Math.round(size * 0.6));
      const align = ln?.align || linesAlign;

      doc.fillColor(color).font(font).fontSize(size).text(text, x + 22, cy, { width: w - 44, align });
      cy += size + gap;
    }

    doc.restore();
  };

  const drawBigCompareTile = ({ x, y, w, h, bg, items, footerNote }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 16).fill(bg);

    const padX = 26;
    const padTop = 26;
    const padBottom = 18;
    const innerW = w - padX * 2;

    const valueColW = 150;
    const labelColW = innerW - valueColW;

    // Footer: etwas größer + minimal fetter nur in pink
    const footerFontSize = bg === COLOR_PINK ? 12 : 11;
    const footerFontName = bg === COLOR_PINK ? 'Poppins-SemiBold' : 'Poppins-Light';
    const footerLineGap = 2;

    let footerH = 0;
    if (footerNote) {
      doc.font(footerFontName).fontSize(footerFontSize);
      const needed = doc.heightOfString(safeStr(footerNote), { width: innerW, lineGap: footerLineGap });
      footerH = Math.min(115, Math.ceil(needed + 16));
    }
    const footerY = y + h - footerH;

    let cy = y + padTop;

    const labelSizeDefault = 15;
    const valueSizeDefault = 16;
    const rowGap = 10;

    for (const it of safeArr(items)) {
      const label = safeStr(it?.label);
      const value = safeStr(it?.value);

      const labelSize = Number.isFinite(it?.labelSize) ? it.labelSize : labelSizeDefault;
      const valueSize = Number.isFinite(it?.valueSize) ? it.valueSize : valueSizeDefault;
      const valueColor = it?.valueColor || COLOR_WHITE;

      doc.font('Poppins-SemiBold').fontSize(labelSize);
      const labelH = doc.heightOfString(label, { width: labelColW });

      doc.font('Poppins-Bold').fontSize(valueSize);
      const valueH = doc.heightOfString(value, { width: valueColW });

      const rowH = Math.max(labelH, valueH);
      if (cy + rowH > footerY - padBottom) break;

      doc
        .fillColor(COLOR_WHITE)
        .font('Poppins-SemiBold')
        .fontSize(labelSize)
        .text(label, x + padX, cy, { width: labelColW });

      const valueBoxX = x + padX + labelColW;

      doc
        .fillColor(valueColor)
        .font('Poppins-Bold')
        .fontSize(valueSize)
        .text(value, valueBoxX, cy, { width: valueColW, align: 'right' });

      // Pinselstrich dicker
      if (it?.underlineValue && fs.existsSync(BRUSH_WHITE)) {
        doc.font('Poppins-Bold').fontSize(valueSize);
        const textW = doc.widthOfString(value);

        const x2 = valueBoxX + valueColW;
        const x1 = x2 - textW;

        const imgY = cy + valueSize + 2;
        const imgH = 24;

        doc.save();
        doc.opacity(0.98);
        doc.image(BRUSH_WHITE, x1, imgY, { width: textW, height: imgH });
        doc.restore();
      }

      cy += rowH + rowGap;
    }

    if (footerNote) {
      doc
        .fillColor(COLOR_WHITE)
        .font(footerFontName)
        .fontSize(footerFontSize)
        .text(safeStr(footerNote), x + padX, footerY + 8, {
          width: innerW,
          height: Math.max(0, footerH - 16),
          lineGap: footerLineGap
        });
    }

    doc.restore();
  };

  const drawCTAButton = ({ x, y, w, h, text, link }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 14).fill(COLOR_PINK);

    doc
      .fillColor(COLOR_WHITE)
      .font('Poppins-SemiBold')
      .fontSize(14)
      .text(safeStr(text), x, y + 10, { width: w, align: 'center', link });

    doc.restore();
  };

  const ensureNewPage = () => {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 50 });
  };

  // =============================================================
  // SEITE 3: Aktuelle No-Show-Situation
  // =============================================================
  doc.fillColor(COLOR_DARK).font('Poppins-Light').fontSize(28).text('Deine aktuelle No-Show-Situation', marginL, 50);

  doc
    .fillColor(COLOR_GRAY)
    .font('Poppins-Light')
    .fontSize(14)
    .text(
      'Basierend auf deinen Angaben haben wir deine No-Show-Quote und den Umsatzverlust durch nicht erschienene Gäste für die letzten 30 Tage berechnet.',
      marginL,
      92,
      { width: contentW }
    );

  const tileGap = 26;
  const tileW = (contentW - tileGap) / 2;
  const tileH = 150;
  const tileY = 140;

  drawKpiTile({
    x: marginL,
    y: tileY,
    w: tileW,
    h: tileH,
    title: 'No-Show-Rate (30 Tage)',
    value: `${noShowRate.toFixed(1)}%`,
    bg: COLOR_DARK
  });

  drawKpiTile({
    x: marginL + tileW + tileGap,
    y: tileY,
    w: tileW,
    h: tileH,
    title: 'Umsatzverlust (30 Tage)',
    value: `${formatCurrency(loss30 || netLoss30)} ${currency}`,
    bg: COLOR_DARK
  });

  const benchTitleY = tileY + tileH + 34;

  doc
    .fillColor(COLOR_DARK)
    .font('Poppins-Bold')
    .fontSize(18)
    .text('Ø No-Show-Raten von Restaurants im DACH-Raum', marginL, benchTitleY);

  const benchY = benchTitleY + 50;
  const benchGap = 18;
  const benchW = (contentW - benchGap * 2) / 3;
  const benchH = 120;

  drawOutlineTile({
    x: marginL,
    y: benchY,
    w: benchW,
    h: benchH,
    title: 'Deutschland',
    titleAlign: 'center',
    linesAlign: 'center',
    lines: [{ text: '15–18 %', font: 'Poppins-Bold', size: 22, color: COLOR_DARK, gap: 0, align: 'center' }]
  });

  drawOutlineTile({
    x: marginL + benchW + benchGap,
    y: benchY,
    w: benchW,
    h: benchH,
    title: 'Österreich',
    titleAlign: 'center',
    linesAlign: 'center',
    lines: [{ text: '14–17 %', font: 'Poppins-Bold', size: 22, color: COLOR_DARK, gap: 0, align: 'center' }]
  });

  drawOutlineTile({
    x: marginL + (benchW + benchGap) * 2,
    y: benchY,
    w: benchW,
    h: benchH,
    title: 'Schweiz',
    titleAlign: 'center',
    linesAlign: 'center',
    lines: [{ text: '12–15 %', font: 'Poppins-Bold', size: 22, color: COLOR_DARK, gap: 0, align: 'center' }]
  });

  doc
    .fillColor(COLOR_GRAY)
    .font('Poppins-Light')
    .fontSize(10)
    .text('Quelle: Diese Zahlen sind aus aggregierten Branchenreports und Betreiberdaten.', marginL, benchY + benchH + 14);

  // =============================================================
  // SEITE 4: Dein Potenzial
  // =============================================================
  const shouldShowPotentialPage = hasOtherTool || usesAleno || hasOnline === 'Nein';

  if (shouldShowPotentialPage) {
    ensureNewPage();

    pageW = doc.page.width;
    pageH = doc.page.height;
    marginL = doc.page.margins.left;
    marginR = doc.page.margins.right;
    contentW = pageW - marginL - marginR;

    doc.fillColor(COLOR_DARK).font('Poppins-Light').fontSize(28).text('Dein Potenzial', marginL, 50);

    doc
      .fillColor(COLOR_GRAY)
      .font('Poppins-Light')
      .fontSize(14)
      .text(
        'So könnte sich dein Reservierungsumsatz entwickeln, wenn du deine No-Show-Rate auf < 0,3 % senkst und zusätzlich 15 % mehr Umsatz pro reserviertem Gast erzielst.',
        marginL,
        92,
        { width: contentW }
      );

    const boxGap = 26;
    const boxW = (contentW - boxGap) / 2;

    const headerY = 155;
    const boxY = headerY + 28;

    const hintY = pageH - 78;
    const bottomReserve = 26;

    const boxH = Math.max(260, (hintY - bottomReserve) - boxY);

    let leftTitle = 'Mit bestehender Software:';
    let rightTitle = 'Mit aleno:';

    if (hasOnline === 'Nein') {
      leftTitle = 'Ohne Software:';
      rightTitle = 'Mit aleno:';
    } else if (usesAleno) {
      leftTitle = 'aleno mit deinem Setup:';
      rightTitle = 'aleno für dich angepasst:';
    }

    doc.fillColor(COLOR_DARK).font('Poppins-Bold').fontSize(18).text(leftTitle, marginL, headerY, { width: boxW });
    doc
      .fillColor(COLOR_DARK)
      .font('Poppins-Bold')
      .fontSize(18)
      .text(rightTitle, marginL + boxW + boxGap, headerY, { width: boxW });

    const revenueLabel = 'Reservierungs-Umsatz (30 Tage)';

    // ✅ Keine manuellen Umbrüche – PDFKit bricht bei Leerzeichen automatisch um
    const footerNoteText =
      '* z. B. durch automatische Auslastungsoptimierung, 360-Grad-Gästedaten für individuelles Upselling, gezielte Ansprache umsatzstarker Gäste etc.';

    drawBigCompareTile({
      x: marginL,
      y: boxY,
      w: boxW,
      h: boxH,
      bg: COLOR_DARK,
      items: [
        { label: 'No-Show-Rate', value: `${noShowRate.toFixed(1)} %` },
        { label: revenueLabel, value: `${formatCurrency(revenueActual30)} ${currency}` },
        { label: 'Zusätzliches Umsatzpotenzial', value: '—' },
        { label: 'Zeitersparnis', value: '0 Stunden' }
      ]
    });

    drawBigCompareTile({
      x: marginL + boxW + boxGap,
      y: boxY,
      w: boxW,
      h: boxH,
      bg: COLOR_PINK,
      items: [
        { label: 'No-Show-Rate', value: '< 0,3 %' },
        { label: revenueLabel, value: `${formatCurrency(revenueWithAlenoBase)} ${currency}` },
        {
          label: 'Zusätzliches Umsatzpotenzial',
          value: `${formatCurrency(extraUpside15)} ${currency}`,
          valueSize: 18,
          underlineValue: true
        },
        { label: 'Zeitersparnis', value: '14h pro Woche' }
      ],
      footerNote: footerNoteText
    });

    doc
      .fillColor(COLOR_GRAY)
      .font('Poppins-Light')
      .fontSize(10)
      .text(
        'Hinweis: Die dargestellten Potenziale beruhen auf deinen Eingaben und einer 30-Tage-Hochrechnung.',
        marginL,
        hintY,
        { width: contentW }
      );
  }

  // =============================================================
  // SEITE 5: 4 wirksame Maßnahmen gegen No-Shows
  // =============================================================
  ensureNewPage();

  pageW = doc.page.width;
  pageH = doc.page.height;
  marginL = doc.page.margins.left;
  marginR = doc.page.margins.right;
  contentW = pageW - marginL - marginR;

  doc.fillColor(COLOR_DARK).font('Poppins-Light').fontSize(28).text('4 wirksame Maßnahmen gegen No-Shows', marginL, 50);

  const tipsX = marginL;
  let tipsY = 105;

  const tipTitle = (n, t) => {
    tipsY += 10; // kompakter
    doc.fillColor(COLOR_DARK).font('Poppins-Bold').fontSize(18).text(`${n}. ${safeStr(t)}`, tipsX, tipsY);
    tipsY += 22; // kompakter
  };

  // dynamisch + kompakt
  const tipBody = (txt) => {
    const text = safeStr(txt);
    doc.fillColor(COLOR_GRAY).font('Poppins-Light').fontSize(14);

    const h = doc.heightOfString(text, { width: contentW, lineGap: 2 });
    doc.text(text, tipsX, tipsY, { width: contentW, lineGap: 2 });

    tipsY += h + 14; // kompakter
  };

  tipTitle(1, 'Autom. Erinnerung');
  tipBody(
    'Schicke 2 Tage vor dem Termin einen Hinweis auf den bevorstehenden Besuch mit der Möglichkeit, online zu stornieren (z. B. bis spätestens 24h vorher). So kannst du Tische rechtzeitig neu vergeben.'
  );

  tipTitle(2, 'Provisorische Reservierungen');
  tipBody(
    'Kommuniziere bei der Reservierung, dass die Reservierung erst nach Bestätigung durch das Restaurant gültig ist. So kannst du im CRM prüfen, ob der Gast früher No-Shows generiert hat.'
  );

  tipTitle(3, 'Ticketing für Events und Specials');
  tipBody(
    "Lass Gäste nicht nur reservieren, sondern direkt buchen – z. B. Chef’s Table: Gäste wählen im Reservierungsprozess direkt ihr Menü und bezahlen im Voraus. Damit sicherst du dir Umsätze, kannst gezielter einkaufen und steigerst die Vorfreude deiner Gäste."
  );

  tipTitle(4, 'Warteliste');
  tipBody(
    'Wenn dein Restaurant gut gebucht ist, setze eine Warteliste ein, in die sich Gäste selbst eintragen können. Wird kurzfristig ein Tisch frei, kannst du dem nächsten passenden Gast den Tisch anbieten.'
  );

  const ctaW = 320;
  const ctaY = pageH - 88;

  drawCTAButton({
    x: marginL + (contentW - ctaW) / 2,
    y: ctaY,
    w: ctaW,
    h: 46,
    text: 'Mehr Tipps zur No-Show-Vermeidung',
    link: 'https://www.aleno.me/de/blog/no-show-restaurant?utm_source=no-show-calculator-report&utm_medium=pdf&utm_campaign=lead-no-show&utm_content=no-show-tipps'
  });

  // =============================================================
  // SEITE 6: Whitepaper-Stil + Demo-CTA
  // =============================================================
  ensureNewPage();

  pageW = doc.page.width;
  pageH = doc.page.height;
  marginL = doc.page.margins.left;
  marginR = doc.page.margins.right;
  contentW = pageW - marginL - marginR;

  doc.rect(0, 0, pageW, pageH).fill(COLOR_DARK);

  doc.fillColor(COLOR_WHITE).font('Poppins-Light').fontSize(40).text('Mit aleno erfolgreicher werden', marginL, 55, {
    width: contentW
  });

  const colGap = 30;
  const colW = (contentW - colGap) / 2;
  const introY = 135;

  doc
    .fillColor(COLOR_WHITE)
    .font('Poppins-Light')
    .fontSize(14)
    .text(
      'Der Digitale Assistent aleno ist die Lösung für Reservierungen, Betriebsoptimierung und Umsatzsteigerung in der Gastronomie.',
      marginL,
      introY,
      { width: colW }
    );

  doc
    .fillColor(COLOR_WHITE)
    .font('Poppins-Light')
    .fontSize(14)
    .text(
      'Die Software unterstützt dabei, Abläufe zu automatisieren, Auslastung zu steigern und Gäste langfristig zu binden.',
      marginL + colW + colGap,
      introY,
      { width: colW }
    );

  const pinkY = introY + 80;
  const pinkGap = 18;
  const pinkW = (contentW - pinkGap * 2) / 3;
  const pinkH = 110;
  const pinkR = 14;

  const pinkBox = (x, title, body) => {
    doc.save();

    doc.roundedRect(x, pinkY, pinkW, pinkH, pinkR).fill(COLOR_PINK);

    doc
      .fillColor(COLOR_WHITE)
      .font('Poppins-Bold')
      .fontSize(18)
      .text(title, x + 18, pinkY + 16, { width: pinkW - 36 });

    doc
      .fillColor(COLOR_WHITE)
      .font('Poppins-Light')
      .fontSize(12)
      .text(body, x + 18, pinkY + 44, { width: pinkW - 36, lineGap: 2 });

    doc.restore();
  };

  pinkBox(
    marginL,
    '15% mehr Gäste',
    'Die L’Osteria konnte mit aleno in über 200 Betrieben Auslastung und Umsatz deutlich steigern.'
  );

  pinkBox(
    marginL + pinkW + pinkGap,
    '< 0,3% No-Shows',
    'Das „Mural“ in München hat mit aleno No-Shows von 20% auf fast 0% reduziert.'
  );

  pinkBox(
    marginL + (pinkW + pinkGap) * 2,
    '5,2x ROI',
    'Für das Restaurant Zur Taube in Zug zahlt sich der Einsatz von aleno um ein Vielfaches aus.'
  );

  const vY = pinkY + pinkH + 32;

  doc.fillColor(COLOR_WHITE).font('Poppins-Bold').fontSize(20).text('Deine Vorteile mit aleno:', marginL, vY);

  const benefits = [
    'Spare mehrere Stunden Arbeit pro Woche durch Automatisierung',
    'Nutze 360-Grad-Gästeprofile für gezieltes und erfolgreiches Upselling',
    'Optimiere die Auslastung durch KI-gestützte Tischzuweisung',
    'Reduziere No-Shows und erhalte verbindliche Buchungen',
    'Behalte volle Kontrolle über deine Daten und deine Marke'
  ];

  let bY = vY + 32;

  for (const text of benefits) {
    doc.save();
    doc.fillColor(COLOR_PINK).circle(marginL + 6, bY + 8, 5).fill();
    doc.restore();

    doc
      .fillColor(COLOR_WHITE)
      .font('Poppins-Light')
      .fontSize(13)
      .text(text, marginL + 20, bY, { width: contentW - 40 });

    bY += 24;
  }

  const ctaW5 = 260;
  const ctaH5 = 46;

  const drawCTAButtonOnDark = ({ x, y, w, h, text, link }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 14).fill(COLOR_PINK);
    doc
      .fillColor(COLOR_WHITE)
      .font('Poppins-SemiBold')
      .fontSize(14)
      .text(safeStr(text), x, y + 10, { width: w, align: 'center', link });
    doc.restore();
  };

  drawCTAButtonOnDark({
    x: pageW - marginR - ctaW5,
    y: pageH - 85,
    w: ctaW5,
    h: ctaH5,
    text: 'Jetzt Demo buchen',
    link: 'https://www.aleno.me/de/demo?utm_source=no-show-calculator-report&utm_medium=pdf&utm_campaign=lead-no-show&utm_content=book-demo'
  });

  return doc;
}
