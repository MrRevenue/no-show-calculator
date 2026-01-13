import { useEffect, useMemo, useRef, useState } from "react";

export default function NoShowCalculator() {
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

  const topRef = useRef(null);
  const contactFormRef = useRef(null);

  // --- Helper: scrollt die Seite so, dass das Formular oben sauber sichtbar ist (inkl. Offset für Header) ---
  const scrollToTop = (behavior = "smooth") => {
    const el = topRef.current;
    if (!el) return;

    // Offset: Header / Sticky Nav – bei aleno typischerweise ~80-110px
    const headerOffset = window.innerWidth < 768 ? 80 : 110;

    // Warten, bis DOM nach Step-Wechsel wirklich gerendert ist
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const y = rect.top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: Math.max(0, y), behavior });
      });
    });
  };

  /**
   * ✅ Fix 1: Reload-Jump nach unten verhindern
   * - Wenn ein Hash wie #no-show-calculator in der URL bleibt, scrollt der Browser beim Reload dahin.
   * - Wir entfernen den Hash nach dem Mount (ohne Reload).
   */
  useEffect(() => {
    try {
      if (window.location.hash && window.location.hash.toLowerCase() === "#no-show-calculator") {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } catch {}
  }, []);

  /**
   * ✅ Keyboard / iFrame / Shadow: stabilisieren
   * - VisualViewport: nur kb-padding als CSS var --kb
   * - Kein globales focusin-scrollIntoView im iFrame
   */
  useEffect(() => {
    const isInIframe = typeof window !== "undefined" && window.self !== window.top;

    let onFocusIn;
    if (!isInIframe) {
      onFocusIn = (e) => {
        const el = e.target;
        if (!el) return;
        const tag = el.tagName?.toLowerCase();
        if (!["input", "textarea", "select"].includes(tag)) return;

        setTimeout(() => {
          try {
            el.scrollIntoView({ block: "nearest" });
          } catch {}
        }, 150);
      };
      window.addEventListener("focusin", onFocusIn);
    }

    const vv = window.visualViewport;
    let cleanupVv = null;
    if (vv) {
      const updateKb = () => {
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty("--kb", `${kb}px`);
      };
      vv.addEventListener("resize", updateKb);
      updateKb();
      cleanupVv = () => vv.removeEventListener("resize", updateKb);
    }

    return () => {
      if (onFocusIn) window.removeEventListener("focusin", onFocusIn);
      if (cleanupVv) cleanupVv();
    };
  }, []);

  useEffect(() => {
    if (showContactForm && contactFormRef.current) {
      // CTA: bewusst scrollen
      scrollToTop("smooth");
      contactFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContactForm]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

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
          ? [
              "reservationTool",
              "feeForNoShow",
              ...(formData.feeForNoShow === "Ja" ? ["noShowFee"] : []),
            ]
          : [],
    };

    const errors = {};
    for (const field of requiredByStep[currentStep] || []) {
      if (!formData[field]) errors[field] = true;
    }
    setFormErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const goFromStep1 = () => {
    if (!validateStep(1)) return;
    setStep(2);
    scrollToTop("smooth");
  };

  const goFromStep2 = () => {
    if (!validateStep(2)) return;

    if (formData.hasOnlineReservation === "Ja") setStep(3);
    else setShowResult(true);

    scrollToTop("smooth");
  };

  const goFromStep3 = () => {
    if (!validateStep(3)) return;
    setShowResult(true);
    scrollToTop("smooth");
  };

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

  // --- Rechenlogik (personenbasiert, 30 Tage) ---
  const reservationsPerDay = +formData.reservationsPerDay || 0;
  const avgGuestsPerReservation = +formData.avgGuestsPerReservation || 0;
  const openDaysPerWeek = +formData.openDays || 0;
  const avgSpendPerGuest = +formData.averageSpend || 0;
  const noShowGuestsInput30 = +formData.noShowGuestsLast30Days || 0;

  const avgGuestsSliderValue = avgGuestsPerReservation || 2;
  const avgSpendSliderValue = avgSpendPerGuest || 50;

  const avgGuestsPercent = ((avgGuestsSliderValue - 1) / (8 - 1)) * 100;
  const avgSpendPercent = ((avgSpendSliderValue - 10) / (500 - 10)) * 100;

  const noShowFeePerGuest = formData.feeForNoShow === "Ja" ? +formData.noShowFee || 0 : 0;

  const OPEN_DAYS_30 = openDaysPerWeek > 0 ? (openDaysPerWeek / 7) * 30 : 0;
  const totalReservations30 = reservationsPerDay * OPEN_DAYS_30;
  const totalGuests30 = totalReservations30 * avgGuestsPerReservation;

  const noShowGuests30 = noShowGuestsInput30;
  const noShowRate = totalGuests30 > 0 ? (noShowGuests30 / totalGuests30) * 100 : 0;

  const totalRevenue30 = totalGuests30 * avgSpendPerGuest;
  const grossLoss30 = noShowGuests30 * avgSpendPerGuest;
  const recoveredByFees30 = noShowGuests30 * noShowFeePerGuest;
  const loss30 = Math.max(grossLoss30 - recoveredByFees30, 0);

  const upsell = totalRevenue30 * 0.05;
  const roi = Math.floor((loss30 + upsell) / 350);

  const format = (val) => Math.round(val).toLocaleString("de-DE");

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
      return;
    }

    if (!isBusinessEmail(formData.email)) {
      setEmailError(
        "Bitte gib eine geschäftliche E-Mail-Adresse an (keine Freemailer wie gmail.com, gmx.de etc.)."
      );
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
      } else {
        console.error("❌ Fehler beim Versand:", result.error || "Unbekannter Fehler");
        setSubmissionStatus("error");
      }
    } catch (error) {
      console.error("❌ Netzwerkfehler:", error);
      setSubmissionStatus("error");
    }
  };

  // Progress
  const totalSteps = 4;
  const currentStepForProgress = showResult ? 4 : step;
  const progressPercent = (currentStepForProgress / totalSteps) * 100;

  // --- Styles (Embed-robust) ---
  const S = useMemo(() => {
    return {
      wrapper: {
        maxWidth: 650,
        margin: "0 auto",
        padding: "24px",
        paddingBottom: "calc(var(--kb, 0px) + 24px)",
        color: "#111827",
        fontFamily:
          "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
      },

      // H2 wie Landingpages: leichter, groß, clean
      h2: {
        fontSize: 40,
        lineHeight: 1.05,
        margin: "8px 0 12px 0",
        fontWeight: 300,
        letterSpacing: "-0.02em",
        color: "#0f172a",
      },
      h2Small: { fontSize: 22, lineHeight: 1.2, margin: "0 0 14px 0", fontWeight: 600, color: "#0f172a" },

      p: { fontSize: 15, lineHeight: 1.55, color: "#475569", margin: "0 0 18px 0" },

      label: { display: "block", fontSize: 14, fontWeight: 600, color: "#0f172a", margin: "0 0 6px 0" },
      helper: { fontSize: 12.5, color: "#64748b", marginTop: 8, lineHeight: 1.4 },
      error: { fontSize: 12.5, color: "#ec4899", marginTop: 8 },

      field: { marginBottom: 26 },

      input: (isError) => ({
        width: "100%",
        fontSize: 16,
        lineHeight: 1.25,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${isError ? "#ec4899" : "#cbd5e1"}`,
        outline: "none",
        background: "#fff",
        color: "#0f172a",
      }),

      select: (isError) => ({
        width: "100%",
        fontSize: 16,
        lineHeight: 1.25,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${isError ? "#ec4899" : "#cbd5e1"}`,
        background: "#fff",
        color: "#0f172a",
      }),

      btnPrimary: {
        backgroundColor: "#fe4497",
        border: "2px solid transparent",
        borderRadius: 999,
        color: "#fff",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        padding: "14px 44px",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      },

      btnSecondary: {
        backgroundColor: "#e2e8f0",
        border: "2px solid transparent",
        borderRadius: 999,
        color: "#0f172a",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        padding: "10px 18px",
        cursor: "pointer",
      },

      btnGreen: {
        backgroundColor: "#16a34a",
        border: "2px solid transparent",
        borderRadius: 999,
        color: "#fff",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 700,
        padding: "10px 18px",
        cursor: "pointer",
      },

      progressWrap: { marginBottom: 18 },
      progressTrack: { width: "100%", height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" },
      progressFill: { height: "100%", background: "#ec4899", width: `${progressPercent}%`, transition: "width 250ms ease" },
      progressText: { marginTop: 6, fontSize: 12, color: "#64748b", textAlign: "right" },

      grid2: { display: "grid", gridTemplateColumns: "1fr", gap: 14 },
      card: { background: "#111", color: "#fff", padding: 22, borderRadius: 18, textAlign: "center" },
      cardTitle: { fontSize: 12.5, opacity: 0.9, margin: "0 0 8px 0" },
      // ✅ KPI-Zahlen explizit weiß
      cardValue: { fontSize: 36, fontWeight: 800, margin: 0, color: "#ffffff" },

      grid2Media: `
        @media (min-width: 640px) { .ns-grid-2 { grid-template-columns: 1fr 1fr; } }
      `,
    };
  }, [progressPercent]);

  // Slider CSS direkt im Component (Shadow-safe)
  const sliderCss = `
    input.pink-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;              /* ✅ dünner */
      border-radius: 999px;
      background: #f9a8d4;
      outline: none;
      cursor: pointer;
    }

    input.pink-slider::-webkit-slider-runnable-track {
      height: 6px;              /* ✅ dünner */
      border-radius: 999px;
      background: #f9a8d4;
    }

    input.pink-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #ec4899;
      border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
      margin-top: -6px;         /* ✅ zentriert auf dünner Track */
    }

    input.pink-slider::-moz-range-track {
      height: 6px;
      border-radius: 999px;
      background: #f9a8d4;
    }

    input.pink-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #ec4899;
      border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }
  `;

  const renderField = (field, label, type = "text", options = null) => (
    <div key={field} style={S.field}>
      <label style={S.label}>{label}</label>
      {options ? (
        <select name={field} value={formData[field]} onChange={handleChange} style={S.select(!!formErrors[field])}>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt || "Bitte wählen"}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={field}
          type={type}
          value={formData[field]}
          onChange={handleChange}
          style={S.input(!!formErrors[field])}
        />
      )}
      {formErrors[field] && <p style={S.error}>Bitte ausfüllen.</p>}
    </div>
  );

  return (
    <div style={S.wrapper}>
      <style>{S.grid2Media}</style>
      <style>{sliderCss}</style>

      {/* Scroll-Anker */}
      <div ref={topRef} />

      {/* Progress */}
      <div style={S.progressWrap}>
        <div style={S.progressTrack}>
          <div style={S.progressFill} />
        </div>
        <div style={S.progressText}>
          Schritt {currentStepForProgress} von {totalSteps}
        </div>
      </div>

      {/* STEP 1 */}
      {!showResult && step === 1 && (
        <>
          <h2 style={S.h2}>Berechne deine No-Show-Rate und deinen monatlichen Umsatzverlust</h2>
          <p style={S.p}>
            Beantworte kurz diese Fragen – die Berechnung erfolgt sofort und basiert auf deinen Reservierungen.
          </p>

          <div style={S.field}>
            <label style={S.label}>Ø Reservierungen pro Öffnungstag (alle Kanäle, z. B. 40)</label>
            <input
              name="reservationsPerDay"
              type="number"
              value={formData.reservationsPerDay}
              onChange={handleChange}
              style={S.input(!!formErrors.reservationsPerDay)}
            />
            {formErrors.reservationsPerDay && <p style={S.error}>Bitte ausfüllen.</p>}
            <p style={S.helper}>
              Wie viele Reservierungen (also nicht Anzahl Gäste) hast du an einem typischen Öffnungstag im Durchschnitt –
              egal ob online, telefonisch oder per E-Mail?
            </p>
          </div>

          {/* Slider Gäste */}
          <div style={{ marginBottom: 30 }}>
            <label style={{ ...S.label, marginBottom: 14 }}>Ø Gäste pro Reservierung (z. B. 2,0 Personen)</label>

            <div style={{ position: "relative", width: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  top: -20,
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
                max="8"
                step="0.5"
                value={avgGuestsSliderValue}
                onChange={handleChange}
                className="pink-slider"
              />
            </div>

            <p style={S.helper}>Die meisten Restaurants liegen zwischen 2,0 und 3,0 Gästen pro Reservierung.</p>
            {formErrors.avgGuestsPerReservation && <p style={S.error}>Bitte ausfüllen.</p>}
          </div>

          <div style={S.field}>
            <label style={S.label}>
              Wie viele Personen sind in den letzten 30 Tagen trotz Reservierung ohne rechtzeitige Absage nicht erschienen?
              (Schätzung)
            </label>
            <input
              name="noShowGuestsLast30Days"
              type="number"
              value={formData.noShowGuestsLast30Days}
              onChange={handleChange}
              style={S.input(!!formErrors.noShowGuestsLast30Days)}
            />
            {formErrors.noShowGuestsLast30Days && <p style={S.error}>Bitte ausfüllen.</p>}
            <p style={S.helper}>Bitte die geschätzte Gesamtzahl an Personen angeben, nicht die Anzahl der Reservierungen.</p>
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
          {renderField("openDays", "Anzahl Tage pro Woche geöffnet (z. B. 5)", "number")}

          <div style={{ marginBottom: 30 }}>
            <label style={{ ...S.label, marginBottom: 14 }}>Ø Umsatz pro Gast ({currency})</label>

            <div style={{ position: "relative", width: "100%" }}>
              <div
                style={{
                  position: "absolute",
                  top: -20,
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
              />
            </div>

            <p style={S.helper}>Schätzung reicht aus – nimm den durchschnittlichen Bon inklusive Getränke.</p>
            {formErrors.averageSpend && <p style={S.error}>Bitte ausfüllen.</p>}
          </div>

          {renderField(
            "hasOnlineReservation",
            "Ist für das Restaurant ein Online-Reservierungssystem im Einsatz?",
            "text",
            ["", "Ja", "Nein"]
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button type="button" onClick={() => { setStep(1); scrollToTop("smooth"); }} style={S.btnSecondary}>
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
            renderField("noShowFee", `Wie hoch ist die No-Show-Gebühr pro Gast (${currency})?`, "number")}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button type="button" onClick={() => { setStep(2); scrollToTop("smooth"); }} style={S.btnSecondary}>
              Zurück
            </button>
            <button type="button" onClick={goFromStep3} style={S.btnGreen}>
              Auswertung anzeigen
            </button>
          </div>
        </>
      )}

      {/* RESULT */}
      {showResult && (
        <>
          <h2 style={{ ...S.h2Small, textAlign: "center", fontSize: 30, marginTop: 8, fontWeight: 700 }}>
            Deine Auswertung
          </h2>

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
              <p style={{ margin: "0 0 14px 0", fontWeight: 600, color: "#0f172a", lineHeight: 1.35 }}>
                Möchtest du eine detaillierte Auswertung als PDF inkl. konkreter Handlungsempfehlungen für dein Restaurant erhalten?
              </p>

              <button
                type="button"
                onClick={() => { setShowContactForm(true); }}
                style={{ ...S.btnPrimary, width: "100%", maxWidth: 520 }}
              >
                Ja, PDF-Report erhalten
              </button>
            </div>
          )}

          {showContactForm && !submissionSuccess && (
            <form
              ref={contactFormRef}
              onSubmit={handleSubmit}
              style={{ marginTop: 22, borderTop: "1px solid #e2e8f0", paddingTop: 18 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Vorname" style={S.input(false)} required />
                <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Nachname" style={S.input(false)} required />
              </div>

              <div style={{ height: 12 }} />

              <input name="restaurantName" value={formData.restaurantName} onChange={handleChange} placeholder="Name des Restaurants" style={S.input(false)} required />

              <div style={{ height: 12 }} />

              <div>
                <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Business-E-Mail-Adresse" style={S.input(false)} required />
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
                <label htmlFor="policy" style={{ fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
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
                  <p style={{ marginTop: 10, color: "#dc2626", fontSize: 13 }}>
                    Fehler beim Senden. Bitte versuche es später erneut.
                  </p>
                )}
              </div>
            </form>
          )}

          {submissionSuccess && (
            <div style={{ textAlign: "center", background: "#dcfce7", border: "1px solid #86efac", padding: 18, borderRadius: 16, marginTop: 16 }}>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 800, color: "#166534" }}>Vielen Dank!</h2>
              <p style={{ margin: 0, color: "#166534" }}>Dein No-Show-Report wurde erfolgreich per E-Mail versendet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}