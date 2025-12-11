import { useEffect, useRef, useState } from 'react';

export default function NoShowCalculator() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    restaurantType: '',
    reservationsPerDay: '',
    avgGuestsPerReservation: '2', // Default: 2 Gäste
    openDays: '',
    averageSpend: '',
    noShowGuestsLast30Days: '',
    hasOnlineReservation: '',
    reservationTool: '',
    feeForNoShow: '',
    noShowFee: '',
    firstName: '',
    lastName: '',
    email: '',
    restaurantName: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyError, setShowPolicyError] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'submitting' | 'success' | 'error' | null
  const [showForm, setShowForm] = useState(true);
  const [emailError, setEmailError] = useState('');
  const contactFormRef = useRef(null);

  useEffect(() => {
    if (showContactForm && contactFormRef.current) {
      contactFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showContactForm]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setFormErrors((prev) => ({ ...prev, [name]: false }));

    if (name === 'email') {
      setEmailError('');
    }

    if (name === 'hasOnlineReservation' && value !== 'Ja') {
      // Relevante Fehler zurücksetzen, wenn kein System eingesetzt wird
      setFormErrors((prev) => ({
        ...prev,
        reservationTool: false,
        feeForNoShow: false,
        noShowFee: false
      }));
    }
  };

  const validateStep = (currentStep = step) => {
    const requiredByStep = {
      // Schritt 1
      1: ['reservationsPerDay', 'avgGuestsPerReservation', 'noShowGuestsLast30Days'],

      // Schritt 2
      2: ['restaurantType', 'openDays', 'averageSpend', 'hasOnlineReservation'],

      // Schritt 3 – nur wenn Online-Reservierung
      3:
        formData.hasOnlineReservation === 'Ja'
          ? [
              'reservationTool',
              'feeForNoShow',
              ...(formData.feeForNoShow === 'Ja' ? ['noShowFee'] : [])
            ]
          : []
    };

    const errors = {};
    for (const field of requiredByStep[currentStep] || []) {
      if (!formData[field]) {
        errors[field] = true;
      }
    }
    setFormErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const goFromStep1 = () => {
    if (validateStep(1)) {
      setStep(2);
    }
  };

  const goFromStep2 = () => {
    if (validateStep(2)) {
      if (formData.hasOnlineReservation === 'Ja') {
        setStep(3);
      } else {
        setShowResult(true);
      }
    }
  };

  const goFromStep3 = () => {
    if (validateStep(3)) {
      setShowResult(true);
    }
  };

  const reservationToolOptions = [
    '',
    'aleno',
    'CentralPlanner',
    'Formitable',
    'Foratable',
    'Gastronovi',
    'OpenTable',
    'Quandoo',
    'Resmio',
    'Seatris',
    'Tablein',
    'The Fork',
    'Zenchef',
    'ein anderes',
    'Das weiß ich gerade nicht'
  ];

  const restaurantTypeOptions = [
    '',
    'Fine Dining',
    'Casual Dining / Bistro',
    'Café / Konditorei',
    'Bar / Pub / Weinbar',
    'Hotelrestaurant',
    'Popup-Restaurant',
    'Systemgastronomie',
    'Sonstiges'
  ];

  const renderField = (field, label, type = 'text', options = null) => (
    <div key={field} className="mb-8">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {options ? (
        <select
          name={field}
          value={formData[field]}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${
            formErrors[field] ? 'border-pink-500' : 'border-gray-300'
          }`}
        >
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt || 'Bitte wählen'}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={field}
          type={type}
          value={formData[field]}
          onChange={handleChange}
          className={`border p-2 w-full rounded ${
            formErrors[field] ? 'border-pink-500' : 'border-gray-300'
          }`}
        />
      )}
      {formErrors[field] && (
        <p className="text-pink-500 text-xs mt-1">Bitte ausfüllen.</p>
      )}
    </div>
  );

  const currency = '€';

  // --- Rechenlogik (personenbasiert, 30-Tage-Betrachtung) ---

  const reservationsPerDay = +formData.reservationsPerDay || 0; // Ø Reservierungen pro Öffnungstag
  const avgGuestsPerReservation = +formData.avgGuestsPerReservation || 0; // Ø Gäste pro Reservierung
  const openDaysPerWeek = +formData.openDays || 0; // Öffnungstage pro Woche
  const avgSpendPerGuest = +formData.averageSpend || 0; // Ø Umsatz pro Gast
  const noShowGuestsInput30 = +formData.noShowGuestsLast30Days || 0; // Gäste, die trotz Reservierung nicht erschienen sind (30 Tage)

  // Slider-Defaults für Darstellung
  const avgGuestsSliderValue = avgGuestsPerReservation || 2;
  const avgSpendSliderValue = avgSpendPerGuest || 50;

  // Prozentwerte für Bubble
  const avgGuestsPercent = ((avgGuestsSliderValue - 1) / (8 - 1)) * 100; // Range 1–8
  const avgSpendPercent = ((avgSpendSliderValue - 10) / (500 - 10)) * 100; // Range 10–500

  // No-Show-Gebühr nur, wenn wirklich erhoben
  const noShowFeePerGuest =
    formData.feeForNoShow === 'Ja' ? +formData.noShowFee || 0 : 0;

  // Anzahl Öffnungstage in 30 Tagen (ausgehend von openDaysPerWeek)
  const OPEN_DAYS_30 = openDaysPerWeek > 0 ? (openDaysPerWeek / 7) * 30 : 0;

  // Gesamtreservierungen & Gäste in 30 Tagen
  const totalReservations30 = reservationsPerDay * OPEN_DAYS_30;
  const totalGuests30 = totalReservations30 * avgGuestsPerReservation;

  // No-Show-Gäste in 30 Tagen
  const noShowGuests30 = noShowGuestsInput30;

  // No-Show-Rate bezogen auf Gäste
  const noShowRate =
    totalGuests30 > 0 ? (noShowGuests30 / totalGuests30) * 100 : 0;

  // Umsatz in 30 Tagen
  const totalRevenue30 = totalGuests30 * avgSpendPerGuest;

  // No-Show-Verlust in 30 Tagen
  const grossLoss30 = noShowGuests30 * avgSpendPerGuest; // entgangener Umsatz
  const recoveredByFees30 = noShowGuests30 * noShowFeePerGuest; // kompensiert durch Gebühren
  const loss30 = Math.max(grossLoss30 - recoveredByFees30, 0); // Nettoverlust

  // Upsell-Potenzial & grober ROI – nur für den PDF-Report relevant
  const upsell = totalRevenue30 * 0.05; // 5% zusätzlicher Umsatz
  const roi = Math.floor((loss30 + upsell) / 350); // grob bei 350 €/Monat Systemkosten

  const format = (val) => Math.round(val).toLocaleString('de-DE');

  const isBusinessEmail = (email) => {
    const freeDomains = [
      'gmail.com',
      'googlemail.com',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'yahoo.com',
      'yahoo.de',
      'gmx.de',
      'gmx.net',
      'web.de',
      'icloud.com',
      'me.com',
      't-online.de',
      'protonmail.com',
      'aol.com'
    ];

    const match = email.trim().toLowerCase().match(/@([^@]+)$/);
    if (!match) return false;
    const domain = match[1];
    return !freeDomains.includes(domain);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptedPolicy) {
      setShowPolicyError(true);
      return;
    }

    if (!isBusinessEmail(formData.email)) {
      setEmailError(
        'Bitte gib eine geschäftliche E-Mail-Adresse an (keine Freemailer wie gmail.com, gmx.de etc.).'
      );
      return;
    }

    setSubmissionStatus('submitting');
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
        noShowGuests30
      }
    };

    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullFormData)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSubmissionSuccess(true);
        setShowForm(false);
        setSubmissionStatus('success');
      } else {
        console.error('❌ Fehler beim Versand:', result.error || 'Unbekannter Fehler');
        setSubmissionStatus('error');
      }
    } catch (error) {
      console.error('❌ Netzwerkfehler:', error);
      setSubmissionStatus('error');
    }
  };

  // Fortschrittsbalken (4 Schritte: 3 Fragen-Schritte + Auswertung)
  const totalSteps = 4;
  const currentStepForProgress = showResult ? 4 : step;
  const progressPercent = (currentStepForProgress / totalSteps) * 100;

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* Fortschrittsbalken */}
      <div className="mb-6">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 text-right">
          Schritt {currentStepForProgress} von {totalSteps}
        </p>
      </div>

{/* Schritt 1: Basisangaben – Reservierungen & No-Shows (Personen) */}
{!showResult && step === 1 && (
  <>
    <h2 className="text-2xl font-bold mb-2">
      Berechne deine No-Show-Rate und deinen monatlichen Umsatzverlust
    </h2>
    <p className="text-sm text-gray-600 mb-4">
      Beantworte kurz diese Fragen – die Berechnung erfolgt sofort und basiert auf deinen
      Reservierungen.
    </p>

    {/* 1. Ø Reservierungen pro Öffnungstag */}
    <div className="mb-8">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Ø Reservierungen pro Öffnungstag (alle Kanäle, z. B. 40)
      </label>
      <input
        name="reservationsPerDay"
        type="number"
        value={formData.reservationsPerDay}
        onChange={handleChange}
        className={`border p-2 w-full rounded ${
          formErrors.reservationsPerDay ? 'border-pink-500' : 'border-gray-300'
        }`}
      />
      {formErrors.reservationsPerDay && (
        <p className="text-pink-500 text-xs mt-1">Bitte ausfüllen.</p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        Wie viele Reservierungen hast du an einem typischen Öffnungstag im Durchschnitt – egal ob
        online, telefonisch oder per E-Mail?
      </p>
    </div>

    {/* 2. Ø Gäste pro Reservierung – Slider */}
    <div className="mb-10">
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Ø Gäste pro Reservierung (z. B. 2,0&nbsp;Personen)
      </label>

      <div className="relative w-full">
        {/* Value Bubble */}
        <div
          className="absolute -top-4 text-xs font-semibold text-pink-600 whitespace-nowrap"
          style={{
            left: `${avgGuestsPercent}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {avgGuestsSliderValue}
        </div>

        {/* Pink Slider */}
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

      <p className="text-xs text-gray-500 mt-1">
        Die meisten Restaurants liegen zwischen 2,0 und 3,0 Gästen pro Reservierung.
      </p>
      {formErrors.avgGuestsPerReservation && (
        <p className="text-pink-500 text-xs mt-1">Bitte ausfüllen.</p>
      )}
    </div>

    {/* 3. No-Shows in Personen */}
    <div className="mb-8">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Wie viele Personen sind in den letzten 30 Tagen trotz Reservierung ohne rechtzeitige Absage
        nicht erschienen? (Schätzung)
      </label>
      <input
        name="noShowGuestsLast30Days"
        type="number"
        value={formData.noShowGuestsLast30Days}
        onChange={handleChange}
        className={`border p-2 w-full rounded ${
          formErrors.noShowGuestsLast30Days ? 'border-pink-500' : 'border-gray-300'
        }`}
      />
      {formErrors.noShowGuestsLast30Days && (
        <p className="text-pink-500 text-xs mt-1">Bitte ausfüllen.</p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        Bitte die geschätzte Gesamtzahl an Personen angeben, nicht die Anzahl der Reservierungen.
      </p>
    </div>

    <button
      type="button"
      onClick={goFromStep1}
      className="mt-6 bg-pink-500 text-white px-8 py-3 rounded-full font-semibold"
    >
      Weiter
    </button>
  </>
)}


      {/* Schritt 2: Restaurant & Wirtschaftlichkeit + Online-Reservierung */}
      {!showResult && step === 2 && (
        <>
          <h2 className="text-xl font-bold mb-4">Angaben zu deinem Restaurant</h2>

          {renderField(
            'restaurantType',
            'Um welche Art von Restaurant handelt es sich?',
            'text',
            restaurantTypeOptions
          )}

          {renderField(
            'openDays',
            'Anzahl Tage pro Woche geöffnet (z. B. 5)',
            'number'
          )}

          {/* Ø Umsatz pro Gast – Slider bis 500 € */}
          <div className="mb-10">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Ø Umsatz pro Gast ({currency})
            </label>

            <div className="relative w-full">
              {/* Value Bubble */}
              <div
                className="absolute -top-4 text-xs font-semibold text-pink-600 whitespace-nowrap"
                style={{
                  left: `${avgSpendPercent}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {avgSpendSliderValue} {currency}
              </div>

              {/* Pink Slider */}
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

            <p className="text-xs text-gray-500 mt-1">
              Schätzung reicht aus – nimm den durchschnittlichen Bon inklusive Getränke.
            </p>
            {formErrors.averageSpend && (
              <p className="text-pink-500 text-xs mt-1">Bitte ausfüllen.</p>
            )}
          </div>

          {renderField(
            'hasOnlineReservation',
            'Ist für das Restaurant ein Online-Reservierungssystem im Einsatz?',
            'text',
            ['', 'Ja', 'Nein']
          )}

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-gray-200 px-4 py-2 rounded-full"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={goFromStep2}
              className="bg-pink-500 text-white px-4 py-2 rounded-full"
            >
              Weiter
            </button>
          </div>
        </>
      )}

      {/* Schritt 3: Details zum Reservierungssystem (nur falls Ja) */}
      {!showResult && step === 3 && formData.hasOnlineReservation === 'Ja' && (
        <>
          <h2 className="text-xl font-bold mb-4">Details zum Reservierungssystem</h2>

          {renderField(
            'reservationTool',
            'Welches Reservierungssystem ist aktuell im Einsatz?',
            'text',
            reservationToolOptions
          )}

          {renderField(
            'feeForNoShow',
            'Werden No-Show-Gebühren erhoben?',
            'text',
            ['', 'Ja', 'Nein']
          )}

          {formData.feeForNoShow === 'Ja' &&
            renderField(
              'noShowFee',
              `Wie hoch ist die No-Show-Gebühr pro Gast (${currency})?`,
              'number'
            )}

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="bg-gray-200 px-4 py-2 rounded-full"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={goFromStep3}
              className="bg-green-600 text-white px-4 py-2 rounded-full"
            >
              Auswertung anzeigen
            </button>
          </div>
        </>
      )}

      {/* Ergebnisbereich */}
      {showResult && (
        <>
          <h2 className="text-2xl font-bold text-center mb-6">Deine Auswertung</h2>

          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            {/* No-Show-Rate */}
            <div className="bg-black text-white p-6 rounded-xl text-center">
              <h3 className="text-sm mb-1">No-Show-Rate (30 Tage)</h3>
              <p className="text-3xl font-semibold">{noShowRate.toFixed(1)}%</p>
            </div>

            {/* No-Show-Verlust */}
            <div className="bg-black text-white p-6 rounded-xl text-center">
              <h3 className="text-sm mb-1">Umsatzverlust durch No-Shows (30 Tage)</h3>
              <p className="text-3xl font-semibold">
                {format(loss30)} {currency}
              </p>
            </div>
          </div>

          {/* Call to Action */}
          {showForm && (
            <div className="text-center mt-6">
              <p className="mb-4 font-medium">
                Möchtest du eine detaillierte Auswertung als PDF inkl. konkreter Handlungsempfehlungen
                für dein Restaurant erhalten?
              </p>

              <button
                type="button"
                onClick={() => setShowContactForm(true)}
                className="bg-pink-500 text-white px-8 py-3 rounded-full font-semibold"
              >
                Ja, PDF-Report erhalten
              </button>
            </div>
          )}

          {/* Kontaktformular */}
          {showContactForm && !submissionSuccess && (
            <form
              ref={contactFormRef}
              onSubmit={handleSubmit}
              className="space-y-4 mt-8 border-t border-gray-200 pt-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Vorname"
                  className="border border-gray-300 p-2 rounded w-full"
                  required
                />
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Nachname"
                  className="border border-gray-300 p-2 rounded w-full"
                  required
                />
              </div>

              <input
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                placeholder="Name des Restaurants"
                className="border border-gray-300 p-2 rounded w-full"
                required
              />

              <div>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  placeholder="Business-E-Mail-Adresse"
                  className="border border-gray-300 p-2 rounded w-full"
                  required
                />
                {emailError && (
                  <p className="text-red-600 text-sm mt-1">{emailError}</p>
                )}
              </div>

              <div className="flex items-start">
                <input
                  id="policy"
                  name="policy"
                  type="checkbox"
                  checked={acceptedPolicy}
                  onChange={(e) => {
                    setAcceptedPolicy(e.target.checked);
                    if (e.target.checked) setShowPolicyError(false);
                  }}
                  className="mr-2 mt-1"
                />
                <label htmlFor="policy" className="text-sm text-gray-700">
                  Ich bin mit der Verarbeitung meiner Daten und der Zusendung des Reports per E-Mail
                  einverstanden und habe die{' '}
                  <a
                    href="https://www.aleno.me/de/datenschutz"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Datenschutzerklärung
                  </a>{' '}
                  gelesen.
                </label>
              </div>

              {showPolicyError && (
                <p className="text-red-600 text-sm">
                  Bitte bestätige die Datenschutzerklärung.
                </p>
              )}

              <button
                type="submit"
                className="bg-pink-500 text-white px-8 py-3 rounded-full w-full disabled:opacity-60"
                disabled={submissionStatus === 'submitting'}
              >
                {submissionStatus === 'submitting' ? 'Wird gesendet…' : 'PDF-Report anfordern'}
              </button>

              {submissionStatus === 'error' && (
                <p className="text-red-600 text-sm mt-2">
                  Fehler beim Senden. Bitte versuche es später erneut.
                </p>
              )}
            </form>
          )}

          {/* Erfolgsmeldung */}
          {submissionSuccess && (
            <div className="text-center bg-green-100 border border-green-300 p-6 rounded-xl mt-6">
              <h2 className="text-xl font-semibold mb-2 text-green-800">Vielen Dank!</h2>
              <p className="text-green-700">
                Dein No-Show-Report wurde erfolgreich per E-Mail versendet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}