import { useEffect, useRef, useState } from 'react';

export default function NoShowCalculator() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    country: '',
    restaurantType: '',
    seats: '',
    reservationsPerDay: '',
    avgGuestsPerReservation: '',
    openDays: '',
    averageSpend: '',
    noShowReservationsLast30Days: '',
    hasOnlineReservation: '',
    reservationTool: '',
    feeForNoShow: '',
    noShowFee: '',
    firstName: '',
    lastName: '',
    email: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyError, setShowPolicyError] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'submitting' | 'success' | 'error' | null
  const [showForm, setShowForm] = useState(true);
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
  };

  const validateStep = () => {
    const requiredByStep = {
      // Schritt 1 – Reservierungsbasierte Grunddaten
      1: [
        'reservationsPerDay',
        'avgGuestsPerReservation',
        'openDays',
        'averageSpend',
        'noShowReservationsLast30Days'
      ],
      // Schritt 2 – Reservierungssystem & Gebühren
      2: [
        'hasOnlineReservation',
        ...(formData.hasOnlineReservation === 'Ja'
          ? [
              'feeForNoShow',
              ...(formData.feeForNoShow === 'Ja' ? ['noShowFee'] : [])
            ]
          : [])
      ]
    };

    const errors = {};
    for (const field of requiredByStep[step] || []) {
      if (!formData[field]) {
        errors[field] = true;
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(2);
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

  const renderField = (field, label, type = 'text', options = null) => (
    <div key={field} className="mb-4">
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
      {formErrors[field] && <p className="text-pink-500 text-xs mt-1">Bitte ausfüllen.</p>}
    </div>
  );

  const currency = formData.country === 'Schweiz' ? 'CHF' : '€';

  // --- Rechenlogik (reservierungsbasiert, 30-Tage-Betrachtung) ---

  const reservationsPerDay = +formData.reservationsPerDay || 0; // Ø Reservierungen pro Öffnungstag
  const avgGuestsPerReservation = +formData.avgGuestsPerReservation || 0; // Ø Gäste pro Reservierung
  const openDaysPerWeek = +formData.openDays || 0; // Öffnungstage pro Woche
  const avgSpendPerGuest = +formData.averageSpend || 0; // Ø Umsatz pro Gast
  const noShowReservations30 = +formData.noShowReservationsLast30Days || 0; // No-Show-Reservierungen in 30 Tagen
  const seats = +formData.seats || 0;

  // No-Show-Gebühr nur, wenn wirklich erhoben
  const noShowFeePerGuest =
    formData.feeForNoShow === 'Ja' ? (+formData.noShowFee || 0) : 0;

  // Anzahl Öffnungstage in 30 Tagen (ausgehend von openDaysPerWeek)
  const OPEN_DAYS_30 = openDaysPerWeek > 0 ? (openDaysPerWeek / 7) * 30 : 0;

  // Gesamtreservierungen & Gäste in 30 Tagen
  const totalReservations30 = reservationsPerDay * OPEN_DAYS_30;
  const totalGuests30 = totalReservations30 * avgGuestsPerReservation;

  // No-Show-Gäste (Reservierungen x Gäste pro Reservierung)
  const noShowGuests30 = noShowReservations30 * avgGuestsPerReservation;

  // No-Show-Rate bezogen auf Reservierungen
  const noShowRate =
    totalReservations30 > 0 ? (noShowReservations30 / totalReservations30) * 100 : 0;

  // Umsatz in 30 Tagen
  const totalRevenue30 = totalGuests30 * avgSpendPerGuest;

  // No-Show-Verlust in 30 Tagen
  const grossLoss30 = noShowGuests30 * avgSpendPerGuest; // entgangener Umsatz
  const recoveredByFees30 = noShowGuests30 * noShowFeePerGuest; // kompensiert durch Gebühren
  const loss30 = Math.max(grossLoss30 - recoveredByFees30, 0); // Nettoverlust

  // Auslastung (optional, wenn Sitzplätze bekannt)
  let occupancy = null;
  if (seats > 0 && OPEN_DAYS_30 > 0) {
    // Annahme: 1 Belegung pro Sitz und Öffnungstag
    const capacityGuests30 = seats * OPEN_DAYS_30;
    occupancy = capacityGuests30 > 0 ? (totalGuests30 / capacityGuests30) * 100 : null;
  }

  // Upsell-Potenzial & grober ROI
  const upsell = totalRevenue30 * 0.05; // 5% zusätzlicher Umsatz
  const roi = Math.floor((loss30 + upsell) / 350); // grob bei 350 €/Monat Systemkosten

  const format = (val) => Math.round(val).toLocaleString('de-DE');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptedPolicy) {
      setShowPolicyError(true);
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
        occupancy,
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

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* Schritt 1: Basisangaben (Reservierungen) */}
      {!showResult && step === 1 && (
        <>
          <h2 className="text-2xl font-bold mb-2">
            Berechne deine No-Show-Rate und deinen monatlichen Umsatzverlust
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Beantworte kurz diese Fragen – die Berechnung erfolgt sofort und basiert auf deinen Reservierungen.
          </p>

          {renderField(
            'reservationsPerDay',
            'Ø Reservierungen pro Öffnungstag (z. B. 40)',
            'number'
          )}
          {renderField(
            'avgGuestsPerReservation',
            'Ø Gäste pro Reservierung (z. B. 2,5)',
            'number'
          )}
          {renderField(
            'openDays',
            'Anzahl Tage pro Woche geöffnet (z. B. 5)',
            'number'
          )}
          {renderField(
            'averageSpend',
            `Ø Umsatz pro Gast (${currency})`,
            'number'
          )}
          {renderField(
            'noShowReservationsLast30Days',
            'Wie viele Reservierungen sind in den letzten 30 Tagen nicht erschienen (No-Shows)?',
            'number'
          )}
          {renderField(
            'seats',
            'Anzahl Sitzplätze (optional – für Auslastung)',
            'number'
          )}

          <button
            type="button"
            onClick={nextStep}
            className="mt-6 bg-pink-500 text-white px-8 py-3 rounded-full font-semibold"
          >
            Weiter
          </button>
        </>
      )}

      {/* Schritt 2: Reservierungssystem */}
      {!showResult && step === 2 && (
        <>
          <h2 className="text-xl font-bold mb-4">Reservierungssystem</h2>

          {renderField(
            'hasOnlineReservation',
            'Ist für dein Restaurant ein Online-Reservierungssystem im Einsatz?',
            'text',
            ['', 'Ja', 'Nein']
          )}

          {formData.hasOnlineReservation === 'Ja' && (
            <>
              {renderField(
                'reservationTool',
                'Welches Reservierungssystem nutzt du aktuell? (optional)',
                'text',
                reservationToolOptions
              )}

              {renderField(
                'feeForNoShow',
                'Erhebst du No-Show-Gebühren?',
                'text',
                ['', 'Ja', 'Nein']
              )}

              {formData.feeForNoShow === 'Ja' &&
                renderField(
                  'noShowFee',
                  `Wie hoch ist die No-Show-Gebühr pro Gast (${currency})?`,
                  'number'
                )}
            </>
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
              onClick={() => {
                if (validateStep()) setShowResult(true);
              }}
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
          <h2 className="text-2xl font-bold text-center mb-4">Deine Auswertung</h2>

          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <div className="bg-pink-50 border border-pink-300 p-4 rounded-xl">
              <h3 className="text-sm text-gray-500">No-Show-Rate (Reservierungen, 30 Tage)</h3>
              <p className="text-xl font-semibold">{noShowRate.toFixed(1)}%</p>
            </div>
            <div className="bg-pink-50 border border-pink-300 p-4 rounded-xl">
              <h3 className="text-sm text-gray-500">No-Show-Umsatzverlust (30 Tage)</h3>
              <p className="text-xl font-semibold">
                {format(loss30)} {currency}
              </p>
            </div>
            <div className="bg-white border p-4 rounded-xl">
              <h3 className="text-sm text-gray-500">Ø Auslastung (30 Tage)</h3>
              <p className="text-xl font-semibold">
                {occupancy !== null ? `${occupancy.toFixed(1)}%` : '–'}
              </p>
            </div>
            <div className="bg-white border p-4 rounded-xl">
              <h3 className="text-sm text-gray-500">Gesamtumsatz (30 Tage)</h3>
              <p className="text-xl font-semibold">
                {format(totalRevenue30)} {currency}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Dein Optimierungspotenzial</h3>
          <ul className="space-y-2">
            <li className="bg-green-50 border border-green-200 p-4 rounded-xl">
              No-Show-Rate (letzte 30 Tage):{' '}
              <strong>{noShowRate.toFixed(1)}%</strong>
            </li>
            <li className="bg-green-50 border border-green-200 p-4 rounded-xl">
              Netto-Umsatzverlust durch No-Shows (30 Tage):{' '}
              <strong>
                {format(loss30)} {currency}
              </strong>
            </li>
            <li className="bg-green-50 border border-green-200 p-4 rounded-xl">
              Potenzielle Mehreinnahmen durch besseres Tisch- und Gästemanagement (Upselling):{' '}
              <strong>
                {format(upsell)} – {format(upsell * 3)} {currency} pro 30 Tage
              </strong>
            </li>
            <li className="bg-green-50 border border-green-200 p-4 rounded-xl">
              Geschätzter ROI beim Einsatz eines professionellen Reservierungssystems wie aleno:{' '}
              <strong>{roi}-fach (mindestens)</strong>
            </li>
          </ul>

          {showForm && (
            <div className="text-center mt-8">
              <p className="mb-2 font-semibold">
                Möchtest du eine detaillierte Auswertung als PDF inkl. konkreter Handlungsempfehlungen für
                dein Restaurant erhalten?
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

          {showContactForm && !submissionSuccess && (
            <form
              ref={contactFormRef}
              onSubmit={handleSubmit}
              className="space-y-4 mt-6 border-t border-gray-200 pt-6"
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
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                placeholder="E-Mail"
                className="border border-gray-300 p-2 rounded w-full"
                required
              />

              <div className="flex items-start">
                <input
                  id="policy"
                  name="policy"
                  type="checkbox"
                  checked={acceptedPolicy}
                  onChange={(e) => {
                    setAcceptedPolicy(e.target.checked);
                    if (e.target.checked) {
                      setShowPolicyError(false);
                    }
                  }}
                  className="mr-2 mt-1"
                />
                <label htmlFor="policy" className="text-sm text-gray-700">
                  Ich bin mit der Verarbeitung meiner Daten und der Zusendung des Reports per E-Mail
                  einverstanden und habe die{' '}
                  <a href="https://www.aleno.me/de/datenschutz" target="_blank" className="underline">
                    Datenschutzerklärung
                  </a>{' '}
                  gelesen.
                </label>
              </div>
              {showPolicyError && (
                <p className="text-red-600 text-sm">Bitte bestätige die Datenschutzerklärung.</p>
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