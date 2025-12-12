import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export function generatePdf(formData) {
  // A4 quer – Cover Full-Bleed (margin 0), Content-Seiten später margin 50
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0
  });

  const get = (key) => formData?.[key] ?? '–';

  // ------------------ Farben (wie gewünscht) ------------------
  const COLOR_DARK = '#282731';
  const COLOR_PINK = '#ff2e92';

  const COLOR_BLACK = '#000000';
  const COLOR_WHITE = '#ffffff';

  const COLOR_GRAY = '#4b5563';
  const COLOR_SUB = '#d1d5db';

  const currency =
    formData.country === 'Schweiz' ||
    formData.country === 'Switzerland' ||
    formData.currency === 'CHF'
      ? 'CHF'
      : '€';

  const formatCurrency = (val) =>
    Math.round(Number(val || 0)).toLocaleString('de-DE');

  // ------------------ Daten aus Frontend-Berechnung ------------------
  const calculated = formData.calculated || {};

  const noShowRateNum = Number(
    typeof calculated.noShowRate === 'number' ? calculated.noShowRate : calculated.noShowRate || 0
  );
  const noShowRate = Number.isFinite(noShowRateNum) ? noShowRateNum : 0;

  const loss30 = Number(
    typeof calculated.loss30 === 'number' ? calculated.loss30 : calculated.loss30 || 0
  );

  const totalRevenue30 = Number(
    typeof calculated.totalRevenue30 === 'number' ? calculated.totalRevenue30 : calculated.totalRevenue30 || 0
  );

  const totalGuests30 = Number(
    typeof calculated.totalGuests30 === 'number' ? calculated.totalGuests30 : calculated.totalGuests30 || 0
  );

  const noShowGuests30 = Number(
    typeof calculated.noShowGuests30 === 'number' ? calculated.noShowGuests30 : calculated.noShowGuests30 || 0
  );

  const avgSpend = Number(formData.averageSpend || 0);
  const noShowFeePerGuest =
    formData.feeForNoShow === 'Ja' ? Number(formData.noShowFee || 0) : 0;

  // Bruttopotenzial/Verlust-Logik (für Umsatzdarstellungen)
  const grossLoss30 = Math.max(noShowGuests30 * avgSpend, 0);
  const recoveredByFees30 = Math.max(noShowGuests30 * noShowFeePerGuest, 0);
  const netLoss30 = Math.max(grossLoss30 - recoveredByFees30, 0); // sollte ≈ loss30 sein

  // „Ist-Umsatz aus Reservierungen“ (vereinfachte Annahme: geplante Gäste - No-Show-Gäste)
  const revenueActual30 = Math.max(totalRevenue30 - grossLoss30, 0);

  // Zielwerte „mit aleno“
  const TARGET_NOSHOW_RATE = 0.003; // 0.3 %
  const targetGrossLoss = Math.max(totalRevenue30 * TARGET_NOSHOW_RATE, 0);
  const avoidableLossGross = Math.max(grossLoss30 - targetGrossLoss, 0); // vermeidbarer Verlust (brutto)
  const revenueWithAlenoBase = Math.max(revenueActual30 + avoidableLossGross, 0);
  const extraUpside15 = Math.max(revenueWithAlenoBase * 0.15, 0);
  const revenueWithAlenoPlus15 = revenueWithAlenoBase + extraUpside15;

  const restaurantName =
    get('restaurantName') !== '–' && String(get('restaurantName')).trim()
      ? String(get('restaurantName')).trim()
      : 'dein Restaurant';

  // ------------------ Bedingungen für Seite 3 ------------------
  const hasOnline = String(get('hasOnlineReservation') || '');
  const reservationToolRaw = String(get('reservationTool') || '');
  const reservationTool = reservationToolRaw.toLowerCase().replace(/\s+/g, '');
  const usesAleno = hasOnline === 'Ja' && reservationTool.includes('aleno');
  const hasOtherTool = hasOnline === 'Ja' && reservationToolRaw && !usesAleno;

  // ------------------ Cover Assets (/public) ------------------
  const COVER_IMAGE = path.join(process.cwd(), 'public', 'guests-restaurant.jpg');
  const LOGO_IMAGE = path.join(process.cwd(), 'public', 'aleno-logo.png');

  // =============================================================
  // SEITE 1: TITELSEITE (wie Vorlage) – Full Bleed
  // =============================================================
  const coverW = doc.page.width;
  const coverH = doc.page.height;

  // Hintergrund
  doc.rect(0, 0, coverW, coverH).fill(COLOR_DARK);

  // Logo oben links
  if (fs.existsSync(LOGO_IMAGE)) {
    doc.image(LOGO_IMAGE, 55, 45, { width: 210 });
  }

  // Titel
  doc
    .fillColor(COLOR_WHITE)
    .font('Helvetica')
    .fontSize(56)
    .text(
      `No-Show-Report\nfür das Restaurant\n„${restaurantName}“`,
      55,
      270,
      { width: coverW * 0.55, lineGap: 6 }
    );

  // Untertitel
  doc
    .fillColor(COLOR_SUB)
    .font('Helvetica')
    .fontSize(26)
    .text('Zahlen, Vergleiche, Tipps', 55, 540, { width: coverW * 0.55 });

  // Bild rechts mit 2 schrägen Kanten (links + unten)
  if (fs.existsSync(COVER_IMAGE)) {
    // Regler für die Schräge:
    const xTopLeft = coverW * 0.62;
    const yTopLeft = 90;
    const xBottomLeft = coverW * 0.72;
    const yBottomLeft = coverH * 0.78;

    doc.save();

    doc
      .polygon(
        xTopLeft, yTopLeft,      // oben links (schräge linke Kante)
        coverW, 0,               // oben rechts
        coverW, coverH,          // unten rechts
        xBottomLeft, yBottomLeft // unten links (schräge Unterkante)
      )
      .clip();

    // etwas größer platzieren, um keine Kanten zu riskieren
    doc.image(COVER_IMAGE, coverW * 0.58, 0, {
      width: coverW * 0.45,
      height: coverH
    });

    doc.restore();
  }

  // =============================================================
  // Ab Seite 2: Content Seiten mit Margin 50 (Rest wie gehabt)
  // =============================================================
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 50 });

  // Layout-Konstanten neu nach Page-Add (Margins ändern sich!)
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const marginL = doc.page.margins.left;
  const marginR = doc.page.margins.right;
  const contentW = pageW - marginL - marginR;

  // ------------------ Layout Helpers ------------------
  const drawKpiTile = ({ x, y, w, h, title, value, bg = COLOR_BLACK, fg = COLOR_WHITE }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 14).fill(bg);
    doc.fillColor(fg).font('Helvetica-Bold').fontSize(16)
      .text(title, x + 24, y + 22, { width: w - 48, align: 'center' });
    doc.fillColor(fg).font('Helvetica-Bold').fontSize(40)
      .text(value, x + 24, y + 58, { width: w - 48, align: 'center' });
    doc.restore();
  };

  const drawOutlineTile = ({ x, y, w, h, title, lines }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 14).lineWidth(2).stroke(COLOR_BLACK);
    doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(18)
      .text(title, x + 22, y + 20, { width: w - 44, align: 'left' });
    doc.fillColor(COLOR_GRAY).font('Helvetica').fontSize(14);

    let cy = y + 58;
    for (const ln of lines) {
      doc.text(ln, x + 22, cy, { width: w - 44 });
      cy += 22;
    }
    doc.restore();
  };

  const drawBigCompareTile = ({ x, y, w, h, bg, header, items, footerNote }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 16).fill(bg);
    doc.fillColor(COLOR_WHITE).font('Helvetica-Bold').fontSize(18)
      .text(header, x + 26, y + 22, { width: w - 52 });

    let cy = y + 64;
    doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(16);
    for (const { label, value } of items) {
      doc.font('Helvetica-Bold').text(label, x + 26, cy, { width: w - 52 });
      doc.font('Helvetica').text(value, x + 26, cy + 18, { width: w - 52 });
      cy += 54;
      if (cy > y + h - 80) break;
    }

    if (footerNote) {
      doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(10)
        .text(footerNote, x + 26, y + h - 48, { width: w - 52 });
    }

    doc.restore();
  };

  const drawCTAButton = ({ x, y, w, h, text, link }) => {
    doc.save();
    doc.roundedRect(x, y, w, h, 14).fill(COLOR_PINK);
    doc.fillColor(COLOR_WHITE).font('Helvetica-Bold').fontSize(14)
      .text(text, x, y + 10, { width: w, align: 'center', link });
    doc.restore();
  };

  const drawCheckBullet = ({ x, y, text }) => {
    doc.save();
    doc.fillColor(COLOR_PINK).circle(x + 6, y + 8, 6).fill();
    doc.fillColor(COLOR_WHITE).font('Helvetica-Bold').fontSize(10).text('✓', x + 3, y + 2);
    doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(13).text(text, x + 20, y, { width: contentW - 40 });
    doc.restore();
  };

  const ensureNewPage = () => {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 50 });
  };

  // =============================================================
  // SEITE 2: Aktuelle No-Show-Situation
  // =============================================================
  doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(28)
    .text('Deine aktuelle No-Show-Situation', marginL, 50);

  doc.fillColor(COLOR_GRAY).font('Helvetica').fontSize(14)
    .text(
      'Basierend auf deinen Angaben haben wir deine No-Show-Quote und den Umsatzverlust durch nicht erschienene Gäste für die letzten 30 Tage berechnet.',
      marginL,
      92,
      { width: contentW }
    );

  // KPI Tiles (groß)
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
    bg: COLOR_BLACK
  });

  drawKpiTile({
    x: marginL + tileW + tileGap,
    y: tileY,
    w: tileW,
    h: tileH,
    title: 'Umsatzverlust durch No-Shows (30 Tage)',
    value: `${formatCurrency(loss30 || netLoss30)} ${currency}`,
    bg: COLOR_BLACK
  });

  // Benchmark section
  const benchTitleY = tileY + tileH + 34;
  doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(18)
    .text('Vergleichszahlen von Restaurants aus dem DACH-Raum', marginL, benchTitleY);

  // personalisierter Satz über/unter Durchschnitt (simple Einordnung)
  const avgDachMid = 15;
  const direction = noShowRate >= avgDachMid ? 'über' : 'unter';
  doc.fillColor(COLOR_GRAY).font('Helvetica').fontSize(13)
    .text(`Deine No-Show-Rate liegt damit ${direction} dem Branchendurchschnitt.`, marginL, benchTitleY + 24);

  const benchY = benchTitleY + 62;
  const benchGap = 18;
  const benchW = (contentW - benchGap * 2) / 3;
  const benchH = 120;

  drawOutlineTile({
    x: marginL,
    y: benchY,
    w: benchW,
    h: benchH,
    title: 'Deutschland',
    lines: ['Ø No-Show-Rate', 'ca. 15–18 %']
  });

  drawOutlineTile({
    x: marginL + benchW + benchGap,
    y: benchY,
    w: benchW,
    h: benchH,
    title: 'Österreich',
    lines: ['Ø No-Show-Rate', 'ca. 14–17 %']
  });

  drawOutlineTile({
    x: marginL + (benchW + benchGap) * 2,
    y: benchY,
    w: benchW,
    h: benchH,
    title: 'Schweiz',
    lines: ['Ø No-Show-Rate', 'ca. 12–15 %']
  });

  doc.fillColor(COLOR_GRAY).font('Helvetica').fontSize(10)
    .text('Quelle: Diese Zahlen sind aus aggregierten Branchenreports und Betreiberdaten.', marginL, benchY + benchH + 14);

  // =============================================================
  // SEITE 3: Dein Potenzial (nur wenn anderes System im Einsatz)
  // =============================================================
  if (hasOtherTool) {
    ensureNewPage();

    doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(28)
      .text('Dein Potenzial', marginL, 50);

    doc.fillColor(COLOR_GRAY).font('Helvetica').fontSize(14)
      .text(
        'So könnte sich dein Reservierungsumsatz entwickeln, wenn du deine No-Show-Rate auf < 0,3 % senkst und zusätzlich 15 % mehr Umsatz pro reserviertem Gast erzielst.',
        marginL,
        92,
        { width: contentW }
      );

    const boxGap = 26;
    const boxW = (contentW - boxGap) / 2;
    const boxH = 360;
    const boxY = 140;

    // Linke Kachel: bestehende Software
    drawBigCompareTile({
      x: marginL,
      y: boxY,
      w: boxW,
      h: boxH,
      bg: COLOR_BLACK,
      header: 'Mit bestehender Software:',
      items: [
        { label: 'No-Show-Rate', value: `${noShowRate.toFixed(1)} %` },
        { label: 'Gesamt-Umsatz über Reservierungen (30 Tage)', value: `${formatCurrency(revenueActual30)} ${currency}` },
        { label: 'Zusätzliches Umsatzpotenzial', value: `${formatCurrency(avoidableLossGross)} ${currency}` },
        { label: 'Zeitersparnis', value: '0 Stunden' }
      ]
    });

    // Rechte Kachel: aleno
    drawBigCompareTile({
      x: marginL + boxW + boxGap,
      y: boxY,
      w: boxW,
      h: boxH,
      bg: COLOR_PINK,
      header: 'Mit aleno:',
      items: [
        { label: 'No-Show-Rate', value: '< 0,3 %' },
        { label: 'Gesamt-Umsatz über Reservierungen (30 Tage)', value: `${formatCurrency(revenueWithAlenoBase)} ${currency}` },
        { label: 'Zusätzliches Umsatzpotenzial*', value: `${formatCurrency(extraUpside15)} ${currency}` },
        { label: 'Zeitersparnis', value: '⌀ 14h pro Woche' }
      ],
      footerNote:
        '* z. B. durch automatische Auslastungsoptimierung, 360-Grad-Gästedaten für individuelles Upselling, gezielte Ansprache umsatzstarker Gäste etc.'
    });

    doc.fillColor(COLOR_GRAY).font('Helvetica').fontSize(10)
      .text(
        'Hinweis: Die dargestellten Potenziale beruhen auf deinen Eingaben und einer 30-Tage-Hochrechnung.',
        marginL,
        pageH - 70,
        { width: contentW }
      );
  }

  // =============================================================
  // SEITE 4: 4 wirksame Maßnahmen gegen No-Shows
  // =============================================================
  ensureNewPage();

  doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(28)
    .text('4 wirksame Maßnahmen gegen No-Shows', marginL, 50);

  const tipsX = marginL;
  let tipsY = 105;

  const tipTitle = (n, t) => {
    doc.fillColor(COLOR_BLACK).font('Helvetica-Bold').fontSize(18).text(`${n}. ${t}`, tipsX, tipsY);
    tipsY += 26;
  };

  const tipBody = (txt) => {
    doc.fillColor(COLOR_GRAY).font('Helvetica').fontSize(14)
      .text(txt, tipsX, tipsY, { width: contentW });
    tipsY += 54;
  };

  tipTitle(1, 'Autom. Erinnerung');
  tipBody(
    'Schicke 2 Tage vor dem Termin einen Hinweis auf den bevorstehenden Besuch mit der Möglichkeit, online zu stornieren (z. B. bis spätestens 24h vorher). So hast du die Möglichkeit, die Tische rechtzeitig neu zu vergeben.'
  );

  tipTitle(2, 'Provisorische Reservierungen');
  tipBody(
    'Kommuniziere bei der Reservierung, dass die Reservierung erst nach Bestätigung durch das Restaurant gültig ist. So kannst du im CRM prüfen, ob der Gast früher No-Shows generiert hat und ob es ein umsatzstarker Gast ist.'
  );

  tipTitle(3, 'Ticketing für Events und Specials');
  tipBody(
    'Lass Gäste nicht nur reservieren, sondern direkt buchen – z. B. Chef’s Table: Gäste wählen im Reservierungsprozess ihr Menü und bezahlen im Voraus. Damit sicherst du dir Umsätze, kannst gezielter einkaufen und steigerst die Vorfreude deiner Gäste.'
  );

  tipTitle(4, 'Warteliste');
  tipBody(
    'Wenn dein Restaurant gut gebucht ist, setze eine Warteliste ein, in die sich Gäste selbst eintragen können. Wird kurzfristig ein Tisch frei, kannst du dem nächsten passenden Gast den Tisch anbieten.'
  );

  drawCTAButton({
    x: marginL,
    y: pageH - 110,
    w: 320,
    h: 46,
    text: 'Mehr Tipps zur No-Show-Vermeidung',
    link: 'https://www.aleno.me/de/blog/no-show-restaurant'
  });

  // =============================================================
  // SEITE 5: Whitepaper-Stil (Seite 30) + Demo-Button
  // =============================================================
  ensureNewPage();

  // Dunkler Hintergrund
  doc.rect(0, 0, pageW, pageH).fill(COLOR_DARK);

  // Titel
  doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(40)
    .text('Mit aleno Aufwand reduzieren\nund Umsatz steigern', marginL, 55, { width: contentW });

  // Zwei Spalten Intro-Text
  const colGap = 30;
  const colW = (contentW - colGap) / 2;
  const colY = 165;

  doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(14)
    .text(
      'Der Digitale Assistent aleno ist eine smarte All-in-One-Lösung für Gästekommunikation, Tischreservierungen und Betriebsoptimierung in der Gastronomie.',
      marginL,
      colY,
      { width: colW }
    );

  doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(14)
    .text(
      'Die Software unterstützt dabei, Abläufe zu automatisisieren, Auslastung zu steigern und Gäste durch personalisierte Erlebnisse langfristig zu binden.',
      marginL + colW + colGap,
      colY,
      { width: colW }
    );

  // Drei pinke KPI-Kacheln
  const pinkY = 265;
  const pinkGap = 18;
  const pinkW = (contentW - pinkGap * 2) / 3;
  const pinkH = 90;

  const pinkBox = (x, title, body) => {
    doc.save();
    doc.rect(x, pinkY, pinkW, pinkH).fill(COLOR_PINK);
    doc.fillColor(COLOR_WHITE).font('Helvetica-Bold').fontSize(18)
      .text(title, x + 18, pinkY + 16, { width: pinkW - 36 });
    doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(12)
      .text(body, x + 18, pinkY + 42, { width: pinkW - 36 });
    doc.restore();
  };

  pinkBox(marginL, '15% mehr Gäste', 'Die L’Osteria konnte mit aleno in über 200 Betrieben Auslastung und Umsatz deutlich steigern.');
  pinkBox(marginL + pinkW + pinkGap, '< 0,5% No-Shows', 'Das Restaurant Mural in München hat mit aleno die No-Show-Rate von 20% auf 0% reduziert.');
  pinkBox(marginL + (pinkW + pinkGap) * 2, '5,2x ROI', 'Für das Restaurant Zur Taube in Zug zahlt sich der Einsatz von aleno um ein Vielfaches aus.');

  // Vorteile
  const vY = 385;
  doc.fillColor(COLOR_WHITE).font('Helvetica-Bold').fontSize(20)
    .text('Deine Vorteile mit aleno:', marginL, vY);

  let by = vY + 34;
  const benefits = [
    'Spare mehrere Stunden Arbeit pro Woche durch Automatisierung',
    'Nutze 360-Grad-Gästeprofile für gezieltes und erfolgreiches Upselling',
    'Optimiere die Auslastung durch KI-gestützte Tischzuweisung',
    'Reduziere No-Shows und erhalte verbindliche Buchungen',
    'Behalte volle Kontrolle über deine Daten und deine Marke'
  ];
  for (const b of benefits) {
    drawCheckBullet({ x: marginL, y: by, text: b });
    by += 26;
  }

  // Masterplan
  const mY = by + 22;
  doc.fillColor(COLOR_WHITE).font('Helvetica-Bold').fontSize(20)
    .text('Dein Masterplan zu mehr Erfolg:', marginL, mY);

  let my = mY + 36;
  const master = [
    { head: 'Buche eine kostenlose live Demo', text: 'Lerne die Möglichkeiten von aleno kennen.' },
    { head: 'Erhalte eine individuelle Beratung', text: 'Entdecke, welche Optimierungspotenziale in deinem Restaurant oder Hotel aktiviert werden können.' },
    { head: 'Starte direkt durch', text: 'Das aleno-Team richtet das System für dich ein.' }
  ];

  for (const item of master) {
    doc.fillColor(COLOR_PINK).font('Helvetica-Bold').fontSize(14).text('•', marginL, my);
    doc.fillColor(COLOR_WHITE).font('Helvetica-Bold').fontSize(14)
      .text(`${item.head}:`, marginL + 16, my, { continued: true });
    doc.fillColor(COLOR_WHITE).font('Helvetica').fontSize(14)
      .text(` ${item.text}`, { width: contentW - 40 });
    my += 26;
  }

  // CTA Button
  drawCTAButton({
    x: marginL,
    y: pageH - 95,
    w: 320,
    h: 46,
    text: 'Kostenlose Demo buchen',
    link: 'https://www.aleno.me/de/demo'
  });

  // Ende
  doc.end();
  return doc;
}
