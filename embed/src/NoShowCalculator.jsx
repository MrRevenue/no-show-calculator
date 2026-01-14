import { useEffect, useRef, useState, useCallback } from "react";

export default function NoShowCalculator() {
  const MAX_GUESTS_PER_RES = 10; // ✅ bis 10
  const DAYS_30 = 30;
  const HEADER_OFFSET = 110;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    restaurantType: "",
    reservationsPerDay: "",
    avgGuestsPerReservation: "2",
    openDays: "",
    averageSpend: "",
    noShowGuestsLast30Days: "",
    hasOnlineReservation: "",
    reservationTool: "",
    feeForNoShow: "",
    noShowFee: "",
    firstName: "",
    lastName: "",
    email: "",
    restaurantName: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyError, setShowPolicyError] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'submitting' | 'success' | 'error' | null
  const [showForm, setShowForm] = useState(true);
  const [emailError, setEmailError] = useState("");

  const wrapperRef = useRef(null);
  const contactFormRef = useRef(null);
  const progressWrapRef = useRef(null);

  // ------------------------------------------------------------
  // Scroll helpers (Sticky Header)
  // ------------------------------------------------------------
  const scrollToElWithOffset = useCallback((el, behavior = "smooth", extraOffset = 0) => {
    try {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetY = Math.max(0, window.scrollY + rect.top - HEADER_OFFSET - extraOffset);
      window.scrollTo({ top: targetY, behavior });
    } catch {}
  }, []);

  const scrollToEmbedTop = useCallback(
    (behavior = "smooth") => {
      const container = wrapperRef.current || document.getElementById("no-show-calculator");
      if (!container) return;
      scrollToElWithOffset(container, behavior, 0);
    },
    [scrollToElWithOffset]
  );

  // ------------------------------------------------------------
  // Shadow-DOM aware active element (HubSpot/Embeds können Shadow nutzen)
  // ------------------------------------------------------------
  const getDeepActiveElement = () => {
    try {
      let el = document.activeElement;
      while (el && el.shadowRoot && el.shadowRoot.activeElement) {
        el = el.shadowRoot.activeElement;
      }
      return el;
    } catch {
      return document.activeElement;
    }
  };

  const blurTextInputIfAny = useCallback(() => {
    try {
      const el = getDeepActiveElement();
      if (!el) return;
      const tag = el.tagName?.toLowerCase();
      if (!["input", "textarea", "select"].includes(tag)) return;
      const type = el.getAttribute?.("type")?.toLowerCase();
      if (type === "range") return; // Slider nicht bluren
      el.blur?.();
    } catch {}
  }, []);

  const isKeyboardOpen = () => {
    try {
      const vv = window.visualViewport;
      if (!vv) return false;
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      return kb > 0;
    } catch {
      return false;
    }
  };
  
  // ------------------------------------------------------------
  // Keyboard / VisualViewport -> --kb Padding (nur Layout, kein Blur!)
  // ------------------------------------------------------------
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const updateKb = () => {
      try {
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty("--kb", `${kb}px`);
      } catch {}
    };

    vv.addEventListener("resize", updateKb);
    vv.addEventListener("scroll", updateKb);
    updateKb();

    return () => {
      vv.removeEventListener("resize", updateKb);
      vv.removeEventListener("scroll", updateKb);
    };
  }, []);

  // ------------------------------------------------------------
  // FIX Samsung/Android:
  // Slider soll Keyboard schließen, aber Scroll-Position stabil bleiben
  // (ohne globales blur/pointer-handler -> behebt "2x tippen")
  // ------------------------------------------------------------
  const getCurrentViewportPositions = () => {
    const vv = window.visualViewport;
    return {
      scrollY: window.scrollY || 0,
      visualOffsetTop: vv ? vv.offsetTop : 0,
    };
  };

  const stabilizeRangeStart = useCallback(() => {
    try {
      // Nur reagieren, wenn wirklich Keyboard offen ist (sonst unnötig)
      if (!isKeyboardOpen()) return;

      const scrollY = window.scrollY || 0;

      // Scroll "einfrieren": Body auf fixed setzen
      const body = document.body;
      const html = document.documentElement;

      const prevBodyPosition = body.style.position;
      const prevBodyTop = body.style.top;
      const prevBodyLeft = body.style.left;
      const prevBodyRight = body.style.right;
      const prevBodyWidth = body.style.width;

      const prevHtmlScrollBehavior = html.style.scrollBehavior;

      // wichtig: kein smooth während wir restaurieren
      html.style.scrollBehavior = "auto";

      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";

      // Keyboard schließen
      blurTextInputIfAny();

      // Nach kurzer Zeit wieder freigeben + exakt auf alte Position
      setTimeout(() => {
        try {
          body.style.position = prevBodyPosition;
          body.style.top = prevBodyTop;
          body.style.left = prevBodyLeft;
          body.style.right = prevBodyRight;
          body.style.width = prevBodyWidth;

          window.scrollTo({ top: scrollY, behavior: "auto" });

          html.style.scrollBehavior = prevHtmlScrollBehavior;
        } catch {}
      }, 120); // <- wenn noch minimaler Jump: 160 testen
      } catch {}
  }, [blurTextInputIfAny]);

  // ------------------------------------------------------------
  // Fix #2: Anchor/CTA Klick im Hero abfangen (#no-show-calculator)
  // ------------------------------------------------------------
  useEffect(() => {
    const onDocClickCapture = (e) => {
      try {
        const target = e.target;
        const a = target?.closest?.("a[href^='#']");
        if (!a) return;

        const href = a.getAttribute("href") || "";
        if (!href.startsWith("#")) return;

        const id = href.slice(1);
        if (id !== "no-show-calculator") return;

        const container = wrapperRef.current || document.getElementById("no-show-calculator");
        if (!container) return;

        e.preventDefault();

        // Kein Blur hier nötig (sonst evtl. Tap-Probleme) – aber sicherheitshalber:
        // blurTextInputIfAny();

        const progressH = progressWrapRef.current?.getBoundingClientRect?.().height || 0;
        const extraOffset = Math.max(48, progressH + 12);

        try {
          history.replaceState(null, "", `#${id}`);
        } catch {}

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToElWithOffset(container, "smooth", extraOffset);
          });
        });
      } catch {}
    };

    document.addEventListener("click", onDocClickCapture, true);
    return () => document.removeEventListener("click", onDocClickCapture, true);
  }, [scrollToElWithOffset]);

  // Wenn Contact-Form aufgeht: bewusst scrollen (Progress bleibt sichtbar)
  useEffect(() => {
    if (!showContactForm || !contactFormRef.current) return;

    scrollToEmbedTop("smooth");
    setTimeout(() => {
      scrollToElWithOffset(contactFormRef.current, "smooth", 8);
    }, 220);
  }, [showContactForm, scrollToEmbedTop, scrollToElWithOffset]);

  // ------------------------------------------------------------
  // Input handling + Plausibilität
  // ------------------------------------------------------------
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const clampNonNegative = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    return String(Math.max(0, n));
  };

  const getNoShowCap = (reservationsPerDayValue) => {
    const rpd = Math.max(0, Number(reservationsPerDayValue) || 0);
    return Math.floor(rpd * DAYS_30 * MAX_GUESTS_PER_RES);
  };

  const capNoShowGuests30 = (v, reservationsPerDayValue) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    const cap = getNoShowCap(reservationsPerDayValue);
    return String(clamp(Math.max(0, n), 0, cap));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;

    // numerische Felder: keine Minuswerte
    const numericFields = ["reservationsPerDay", "noShowGuestsLast30Days", "averageSpend", "noShowFee", "openDays"];
    if (numericFields.includes(name) && type !== "checkbox") {
      if (String(newValue) !== "") newValue = clampNonNegative(newValue);
    }

    // openDays clamp 1..7 (aber leeren Wert erlauben)
    if (name === "openDays") {
      if (String(newValue) === "") {
        // allow empty
      } else {
        const n = Number(newValue);
        if (Number.isFinite(n)) newValue = String(clamp(n, 1, 7));
      }
    }

    // noShowGuests cap
    if (name === "noShowGuestsLast30Days") {
      if (String(newValue) !== "") newValue = capNoShowGuests30(newValue, formData.reservationsPerDay);
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setFormErrors((prev) => ({ ...prev, [name]: false }));

    if (name === "email") setEmailError("");

    if (name === "hasOnlineReservation" && value !== "Ja") {
      setFormErrors((prev) => ({
        ...prev,
        reservationTool: false,
        feeForNoShow: false,
        noShowFee: false,
      }));
    }
  };

  const validateStep = (currentStep = step) => {
    const requiredByStep = {
      1: ["reservationsPerDay", "avgGuestsPerReservation", "noShowGuestsLast30Days"],
      2: ["restaurantType", "openDays", "averageSpend", "hasOnlineReservation"],
      3:
        formData.hasOnlineReservation === "Ja"
          ? ["reservationTool", "feeForNoShow", ...(formData.feeForNoShow === "Ja" ? ["noShowFee"] : [])]
          : [],
    };

    const errors = {};
    for (const field of requiredByStep[currentStep] || []) {
      if (formData[field] === "" || formData[field] === null || formData[field] === undefined) errors[field] = true;
    }
    setFormErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const afterStepChangeScroll = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToEmbedTop("smooth");
      });
    });
  };

  const goFromStep1 = () => {
    if (!validateStep(1)) return;
    setStep(2);
    afterStepChangeScroll();
  };

  const goFromStep2 = () => {
    if (!validateStep(2)) return;

    if (formData.hasOnlineReservation === "Ja") {
      setStep(3);
    } else {
      setShowResult(true);
    }
    afterStepChangeScroll();
  };

  const goFromStep3 = () => {
    if (!validateStep(3)) return;
    setShowResult(true);
    afterStepChangeScroll();
  };

  // ------------------------------------------------------------
  // Options
  // ------------------------------------------------------------
  const reservationToolOptions = [
    "",
    "aleno",
    "CentralPlanner",
    "Formitable",
    "Foratable",
    "Gastronovi",
    "OpenTable",
    "Quandoo",
    "Resmio",
    "Seatris",
    "Sevenrooms",
    "Tablein",
    "The Fork",
    "Zenchef",
    "ein anderes",
    "Das weiß ich gerade nicht",
  ];

  const restaurantTypeOptions = [
    "",
    "Fine Dining",
    "Casual Dining / Bistro",
    "Café / Konditorei",
    "Bar / Pub / Weinbar",
    "Hotelrestaurant",
    "Popup-Restaurant",
    "Systemgastronomie",
    "Sonstiges",
  ];

  const currency = "€";

  // ------------------------------------------------------------
  // Rechenlogik (personenbasiert, 30 Tage)
  // ------------------------------------------------------------
  const reservationsPerDay = Math.max(0, +formData.reservationsPerDay || 0);
  const avgGuestsPerReservation = Math.max(0, +formData.avgGuestsPerReservation || 0);
  const openDaysPerWeek = Math.max(0, +formData.openDays || 0);
  const avgSpendPerGuest = Math.max(0, +formData.averageSpend || 0);
  const noShowGuestsInput30 = Math.max(0, +formData.noShowGuestsLast30Days || 0);

  const avgGuestsSliderValue = avgGuestsPerReservation || 2;
  const avgSpendSliderValue = avgSpendPerGuest || 50;

  const avgGuestsPercent = ((avgGuestsSliderValue - 1) / (MAX_GUESTS_PER_RES - 1)) * 100;
  const avgSpendPercent = ((avgSpendSliderValue - 10) / (500 - 10)) * 100;

  const noShowFeePerGuest = formData.feeForNoShow === "Ja" ? Math.max(0, +formData.noShowFee || 0) : 0;

  const OPEN_DAYS_30 = openDaysPerWeek > 0 ? (openDaysPerWeek / 7) * DAYS_30 : 0;
  const totalReservations30 = reservationsPerDay * OPEN_DAYS_30;
  const totalGuests30 = totalReservations30 * avgGuestsPerReservation;

  // ✅ harte Plausibilität: wenn keine Gäste -> keine No-Shows/Loss
  const noShowGuests30 = totalGuests30 > 0 ? Math.min(noShowGuestsInput30, totalGuests30) : 0;

  const noShowRate = totalGuests30 > 0 ? (noShowGuests30 / totalGuests30) * 100 : 0;

  const totalRevenue30 = totalGuests30 * avgSpendPerGuest;
  const grossLoss30 = totalGuests30 > 0 ? noShowGuests30 * avgSpendPerGuest : 0;
  const recoveredByFees30 = totalGuests30 > 0 ? noShowGuests30 * noShowFeePerGuest : 0;
  const loss30 = totalGuests30 > 0 ? Math.max(grossLoss30 - recoveredByFees30, 0) : 0;

  const upsell = totalRevenue30 * 0.05;
  const roi = Math.floor((loss30 + upsell) / 350);

  const format = (val) => Math.round(val).toLocaleString("de-DE");

  // ------------------------------------------------------------
  // Email validation
  // ------------------------------------------------------------
  const isBusinessEmail = (email) => {
    const freeDomains = [
      "gmail.com",
      "googlemail.com",
      "outlook.com",
      "hotmail.com",
      "live.com",
      "yahoo.com",
      "yahoo.de",
      "gmx.de",
      "gmx.net",
      "web.de",
      "icloud.com",
      "me.com",
      "t-online.de",
      "protonmail.com",
      "aol.com",
    ];
    const match = String(email || "").trim().toLowerCase().match(/@([^@]+)$/);
    if (!match) return false;
    return !freeDomains.includes(match[1]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptedPolicy) {
      setShowPolicyError(true);
      requestAnimationFrame(() => scrollToElWithOffset(contactFormRef.current, "smooth", 8));
      return;
    }

    if (!isBusinessEmail(formData.email)) {
      setEmailError("Bitte gib eine geschäftliche E-Mail-Adresse an (keine Freemailer wie gmail.com, gmx.de etc.).");
      requestAnimationFrame(() => scrollToElWithOffset(contactFormRef.current, "smooth", 8));
      return;
    }

    setSubmissionStatus("submitting");
    setShowPolicyError(false);

    const fullFormData = {
      ...formData,
      calculated: {
        noShowRate,
        loss30,
        totalRevenue30,
        upsell,
        roi,
        totalReservations30,
        totalGuests30,
        noShowGuests30,
      },
    };

    try {
      const res = await fetch("https://no-show-calculator.vercel.app/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullFormData),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSubmissionSuccess(true);
        setShowForm(false);
        setSubmissionStatus("success");
        requestAnimationFrame(() => scrollToEmbedTop("smooth"));
      } else {
        console.error("❌ Fehler beim Versand:", result.error || "Unbekannter Fehler");
        setSubmissionStatus("error");
        requestAnimationFrame(() => scrollToElWithOffset(contactFormRef.current, "smooth", 8));
      }
    } catch (error) {
      console.error("❌ Netzwerkfehler:", error);
      setSubmissionStatus("error");
      requestAnimationFrame(() => scrollToElWithOffset(contactFormRef.current, "smooth", 8));
    }
  };

  // ------------------------------------------------------------
  // Progress
  // ------------------------------------------------------------
  const totalSteps = 4;
  const currentStepForProgress = showResult ? 4 : step;
  const progressPercent = (currentStepForProgress / totalSteps) * 100;

  // ------------------------------------------------------------
  // Styles
  // ------------------------------------------------------------
  const S = {
    wrapper: {
      maxWidth: 650,
      margin: "0 auto",
      padding: "24px",
      paddingBottom: "calc(var(--kb, 0px) + 24px)",
      color: "#111827",
      scrollMarginTop: HEADER_OFFSET,
      overflowX: "hidden",
      boxSizing: "border-box",
    },

    h2: { fontSize: 32, lineHeight: 1.15, margin: "8px 0 10px 0", fontWeight: 300 },
    h2Small: { fontSize: 22, lineHeight: 1.2, margin: "0 0 14px 0", fontWeight: 600 },
    p: { fontSize: 15, lineHeight: 1.45, color: "#4b5563", margin: "0 0 16px 0" },

    label: { display: "block", fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 6px 0" },
    helper: { fontSize: 14, lineHeight: 1.45, color: "#6b7280", marginTop: 8 }, // ✅ größer
    error: { fontSize: 12, color: "#ec4899", marginTop: 6 },

    field: { marginBottom: 28 },

    input: (isError) => ({
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      fontSize: 16,
      lineHeight: 1.25,
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${isError ? "#ec4899" : "#d1d5db"}`,
      outline: "none",
      background: "#fff",
      color: "inherit",
    }),

    select: (isError) => ({
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      fontSize: 16,
      lineHeight: 1.25,
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${isError ? "#ec4899" : "#d1d5db"}`,
      background: "#fff",
      color: "inherit",
    }),

    btnPrimary: {
      backgroundColor: "#fe4497",
      border: "2px solid transparent",
      borderRadius: 999,
      color: "#fff",
      fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      fontSize: 14,
      fontWeight: 600,
      padding: "14px 38px",
      textTransform: "uppercase",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    btnSecondary: {
      backgroundColor: "#e5e7eb",
      border: "2px solid transparent",
      borderRadius: 999,
      color: "#111827",
      fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      fontSize: 14,
      fontWeight: 600,
      padding: "10px 18px",
      cursor: "pointer",
    },

    progressWrap: { marginBottom: 18 },
    progressTrack: { width: "100%", height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" },
    progressFill: { height: "100%", background: "#ec4899", transition: "width 250ms ease" },
    progressText: { marginTop: 6, fontSize: 12, color: "#6b7280", textAlign: "right" },

    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 14,
    },

    card: {
      background: "#111",
      color: "#fff",
      padding: 22,
      borderRadius: 16,
      textAlign: "center",
    },

    cardTitle: { fontSize: 12, opacity: 0.9, margin: "0 0 6px 0", color: "#fff" },
    cardValue: { fontSize: 32, fontWeight: 800, margin: 0, color: "#fff" },

    grid2Media: `
      @media (min-width: 640px) {
        .ns-grid-2 { grid-template-columns: 1fr 1fr; }
      }
    `,
  };

  const renderField = (field, label, type = "text", options = null, extraProps = {}) => (
    <div key={field} style={S.field}>
      <label style={S.label}>{label}</label>
      {options ? (
        <select name={field} value={formData[field]} onChange={handleChange} style={S.select(!!formErrors[field])} {...extraProps}>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt || "Bitte wählen"}
            </option>
          ))}
        </select>
      ) : (
        <input name={field} type={type} value={formData[field]} onChange={handleChange} style={S.input(!!formErrors[field])} {...extraProps} />
      )}
      {formErrors[field] && <p style={S.error}>Bitte ausfüllen.</p>}
    </div>
  );

  const pinkRangeStyle = { width: "100%", accentColor: "#ec4899" };

  const maxNoShowInputHint = getNoShowCap(formData.reservationsPerDay);

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div id="no-show-calculator" ref={wrapperRef} style={S.wrapper}>
      <style>{S.grid2Media}</style>

      {/* Progress */}
      <div ref={progressWrapRef} style={S.progressWrap}>
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${progressPercent}%` }} />
        </div>
        <div style={S.progressText}>
          Schritt {currentStepForProgress} von {totalSteps}
        </div>
      </div>

      {/* STEP 1 */}
      {!showResult && step === 1 && (
        <>
          <h2 style={S.h2}>Berechne deine No-Show-Rate und deinen monatlichen Umsatzverlust</h2>
          <p style={S.p}>Beantworte kurz diese Fragen – die Berechnung erfolgt sofort und basiert auf deinen Reservierungen.</p>

          {/* 1 */}
          <div style={S.field}>
            <label style={S.label}>Ø Reservierungen pro Öffnungstag (alle Kanäle, z. B. 40)</label>
            <input
              name="reservationsPerDay"
              type="number"
              inputMode="numeric"
              min={0}
              value={formData.reservationsPerDay}
              onChange={handleChange}
              style={S.input(!!formErrors.reservationsPerDay)}
            />
            {formErrors.reservationsPerDay && <p style={S.error}>Bitte ausfüllen.</p>}
            <p style={S.helper}>
              Wie viele Reservierungen (also nicht Anzahl Gäste) hast du an einem typischen Öffnungstag im Durchschnitt – egal ob online,
              telefonisch oder per E-Mail?
            </p>
          </div>

          {/* 2 Slider Gäste */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ ...S.label, marginBottom: 14 }}>Ø Gäste pro Reservierung (max. {MAX_GUESTS_PER_RES})</label>

            <div style={{ position: "relative", width: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  top: -18,
                  left: `${avgGuestsPercent}%`,
                  transform: "translateX(-50%)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ec4899",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {avgGuestsSliderValue}
              </div>

              <input
                type="range"
                name="avgGuestsPerReservation"
                min="1"
                max={String(MAX_GUESTS_PER_RES)}
                step="0.5"
                value={avgGuestsSliderValue}
                onChange={handleChange}
                className="pink-slider"
                style={pinkRangeStyle}
                onTouchStartCapture={stabilizeRangeStart}
                onPointerDownCapture={stabilizeRangeStart}
                onMouseDownCapture={stabilizeRangeStart}
              />
            </div>

            <p style={S.helper}>Die meisten Restaurants liegen zwischen 2,0 und 3,0 Gästen pro Reservierung.</p>
            {formErrors.avgGuestsPerReservation && <p style={S.error}>Bitte ausfüllen.</p>}
          </div>

          {/* 3 */}
          <div style={S.field}>
            <label style={S.label}>
              Wie viele Personen sind in den letzten 30 Tagen trotz Reservierung ohne rechtzeitige Absage nicht erschienen? (Schätzung)
            </label>
            <input
              name="noShowGuestsLast30Days"
              type="number"
              inputMode="numeric"
              min={0}
              max={maxNoShowInputHint}
              value={formData.noShowGuestsLast30Days}
              onChange={handleChange}
              style={S.input(!!formErrors.noShowGuestsLast30Days)}
            />
            {formErrors.noShowGuestsLast30Days && <p style={S.error}>Bitte ausfüllen.</p>}
            <p style={S.helper}>
              Bitte die geschätzte Gesamtzahl an Personen angeben, nicht die Anzahl der Reservierungen. (Max. aktuell: {maxNoShowInputHint})
            </p>
          </div>

          <button type="button" onClick={goFromStep1} style={S.btnPrimary}>
            Weiter
          </button>
        </>
      )}

      {/* STEP 2 */}
      {!showResult && step === 2 && (
        <>
          <h2 style={S.h2Small}>Angaben zu deinem Restaurant</h2>

          {renderField("restaurantType", "Um welche Art von Restaurant handelt es sich?", "text", restaurantTypeOptions)}

          {renderField("openDays", "Anzahl Tage pro Woche geöffnet (z. B. 5)", "number", null, {
            min: 1,
            max: 7,
            inputMode: "numeric",
          })}

          {/* Slider Umsatz */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ ...S.label, marginBottom: 14 }}>Ø Umsatz pro Gast ({currency})</label>

            <div style={{ position: "relative", width: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  top: -18,
                  left: `${avgSpendPercent}%`,
                  transform: "translateX(-50%)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ec4899",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {avgSpendSliderValue} {currency}
              </div>

              <input
                type="range"
                name="averageSpend"
                min="10"
                max="500"
                step="5"
                value={avgSpendSliderValue}
                onChange={handleChange}
                className="pink-slider"
                style={pinkRangeStyle}
                onTouchStartCapture={stabilizeRangeStart}
                onPointerDownCapture={stabilizeRangeStart}
                onMouseDownCapture={stabilizeRangeStart}
              />
            </div>

            <p style={S.helper}>Schätzung reicht aus – nimm den durchschnittlichen Bon inklusive Getränke.</p>
            {formErrors.averageSpend && <p style={S.error}>Bitte ausfüllen.</p>}
          </div>

          {renderField("hasOnlineReservation", "Ist für das Restaurant ein Online-Reservierungssystem im Einsatz?", "text", ["", "Ja", "Nein"])}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button type="button" onClick={() => (setStep(1), afterStepChangeScroll())} style={S.btnSecondary}>
              Zurück
            </button>
            <button type="button" onClick={goFromStep2} style={S.btnPrimary}>
              Weiter
            </button>
          </div>
        </>
      )}

      {/* STEP 3 */}
      {!showResult && step === 3 && formData.hasOnlineReservation === "Ja" && (
        <>
          <h2 style={S.h2Small}>Details zum Reservierungssystem</h2>

          {renderField("reservationTool", "Welches Reservierungssystem ist aktuell im Einsatz?", "text", reservationToolOptions)}

          {renderField("feeForNoShow", "Werden No-Show-Gebühren erhoben?", "text", ["", "Ja", "Nein"])}

          {formData.feeForNoShow === "Ja" &&
            renderField("noShowFee", `Wie hoch ist die No-Show-Gebühr pro Gast (${currency})?`, "number", null, { min: 0, inputMode: "numeric" })}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button type="button" onClick={() => (setStep(2), afterStepChangeScroll())} style={S.btnSecondary}>
              Zurück
            </button>
            <button type="button" onClick={goFromStep3} style={S.btnPrimary}>
              Auswertung anzeigen
            </button>
          </div>
        </>
      )}

      {/* RESULT */}
      {showResult && (
        <>
          <h2 style={{ ...S.h2Small, textAlign: "center", fontSize: 28, marginTop: 8, fontWeight: 700 }}>Deine Auswertung</h2>

          <div className="ns-grid-2" style={{ ...S.grid2, marginBottom: 24 }}>
            <div style={S.card}>
              <div style={S.cardTitle}>No-Show-Rate (30 Tage)</div>
              <p style={S.cardValue}>{noShowRate.toFixed(1)}%</p>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Umsatzverlust durch No-Shows (30 Tage)</div>
              <p style={S.cardValue}>
                {format(loss30)} {currency}
              </p>
            </div>
          </div>

          {showForm && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <p style={{ margin: "0 0 14px 0", fontWeight: 600, color: "#111827" }}>
                Möchtest du eine detaillierte Auswertung als PDF inkl. konkreter Handlungsempfehlungen für dein Restaurant erhalten?
              </p>

              <button
                type="button"
                onClick={() => {
                  setShowContactForm(true);
                }}
                style={S.btnPrimary}
              >
                Ja, PDF-Report erhalten
              </button>
            </div>
          )}

          {showContactForm && !submissionSuccess && (
            <form
              ref={contactFormRef}
              onSubmit={handleSubmit}
              style={{ marginTop: 22, borderTop: "1px solid #e5e7eb", paddingTop: 18, width: "100%", boxSizing: "border-box" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, width: "100%" }}>
                <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Vorname" style={S.input(false)} required />
                <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Nachname" style={S.input(false)} required />
              </div>

              <div style={{ height: 12 }} />

              <input
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                placeholder="Name des Restaurants"
                style={S.input(false)}
                required
              />

              <div style={{ height: 12 }} />

              <div style={{ width: "100%" }}>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  placeholder="Business-E-Mail-Adresse"
                  style={S.input(false)}
                  required
                />
                {emailError && <p style={{ marginTop: 8, color: "#dc2626", fontSize: 13 }}>{emailError}</p>}
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14 }}>
                <input
                  id="policy"
                  name="policy"
                  type="checkbox"
                  checked={acceptedPolicy}
                  onChange={(e) => {
                    setAcceptedPolicy(e.target.checked);
                    if (e.target.checked) setShowPolicyError(false);
                  }}
                  style={{ marginTop: 3 }}
                />
                <label htmlFor="policy" style={{ fontSize: 13, color: "#374151", lineHeight: 1.4 }}>
                  Ich bin mit der Verarbeitung meiner Daten und der Zusendung des Reports per E-Mail einverstanden und habe die{" "}
                  <a href="https://www.aleno.me/de/datenschutz" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                    Datenschutzerklärung
                  </a>{" "}
                  gelesen.
                </label>
              </div>

              {showPolicyError && <p style={{ marginTop: 8, color: "#dc2626", fontSize: 13 }}>Bitte bestätige die Datenschutzerklärung.</p>}

              <div style={{ marginTop: 14 }}>
                <button
                  type="submit"
                  style={{ ...S.btnPrimary, width: "100%", opacity: submissionStatus === "submitting" ? 0.7 : 1 }}
                  disabled={submissionStatus === "submitting"}
                >
                  {submissionStatus === "submitting" ? "Wird gesendet…" : "PDF-Report anfordern"}
                </button>

                {submissionStatus === "error" && (
                  <p style={{ marginTop: 10, color: "#dc2626", fontSize: 13 }}>Fehler beim Senden. Bitte versuche es später erneut.</p>
                )}
              </div>
            </form>
          )}

          {submissionSuccess && (
            <div
              style={{
                textAlign: "center",
                background: "#dcfce7",
                border: "1px solid #86efac",
                padding: 18,
                borderRadius: 16,
                marginTop: 16,
              }}
            >
              <h2 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 800, color: "#166534" }}>Vielen Dank!</h2>
              <p style={{ margin: 0, color: "#166534" }}>Dein No-Show-Report wurde erfolgreich per E-Mail versendet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
