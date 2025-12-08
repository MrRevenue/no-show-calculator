import { useEffect, useRef, useState } from 'react';

export default function NoShowCalculator() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    country: '',
    restaurantType: '',
    seats: '',
    guestsPerDay: '',
    openDays: '',
    guestReservationRate: '',
    averageSpend: '',
    noShowGuestsLast30Days: '',
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
     // Step 1 bleibt wie gehabt
        1: ['guestsPerDay', 'openDays', 'guestReservationRate', 'averageSpend', 'noShowGuestsLast30Days'],
      // Step 2: nur diese Felder sind Pflicht
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
            formErrors[field] ? 'border-red-500' : 'border-gray-300'
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
            formErrors[field] ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      )}
      {formErrors[field] && <p className="text-red-500 text-xs mt-1">Bitte ausfüllen.</p>}
    </div>
  );

  const currency = formData.country === 'Schweiz' ? 'CHF' : '€';

  const guests = +formData.guestsPerDay || 0;
  const seats = +formData.seats || 0;
  const openDays = +formData.openDays || 0;
  const rate = +formData.guestReservationRate || 0;
  const spend = +formData.averageSpend || 0;
  const noshows = +formData.noShowGuestsLast30Days || 0;
  const noshowFee = +formData.noShowFee || 0;

  const monthlyGuests = guests * openDays * 4.35;
  const totalRes = monthlyGuests * (rate / 100);
  const noshowRate = totalRes > 0 ? ((noshows / totalRes) * 100).toFixed(1) : '0.0';
  const loss = Math.max(noshows * spend - noshows * noshowFee, 0);
  const totalRevenue = monthlyGuests * spend;
  const occupancy = seats > 0 ? (monthlyGuests / (seats * openDays * 4.35)) * 100 : 0;
  const upsell = totalRevenue * 0.05;
  const roi = Math.floor((loss + upsell) / 350);
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
      ...formData
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
      {/* Schritt 1: Basisangaben */}
      {!showResult && step === 1 && (
        <>

        <h2 className="text-2xl font-bold mb-2">Berechne deine No-Show-Rate und deinen monatlichen Umsatzverlust</h2>
          <p className="text-sm text-gray-600 mb-4">
            Beantworte kurz diese 5 Fragen – die Berechnung erfolgt sofort.
          </p>

          {renderField('guestsPerDay', 'Ø Gäste pro Öffnungstag (z. B. 80)', 'number')}
          {renderField('openDays', 'Anzahl Tage pro Woche geöffnet (z. B. 5)', 'number')}
          {renderField(
            'guestReservationRate',
            'Wie viel % deiner Gäste reservieren vorab? (z. B. 60)',
            'number'
          )}
          {renderField('averageSpend', `Ø Umsatz pro Gast (${currency})`, 'number')}
          {renderField(
            'noShowGuestsLast30Days',
            'Wie viele Gäste sind in den letzten 30 Tagen nicht erschienen (No-Shows)?',
            'number'
          )}

          <button
            type="button"
            onClick={nextStep}
            className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
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
                renderField('noShowFee', 'Wie hoch ist die No-Show-Gebühr pro Gast?', 'number')}
            </>
          )}

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => {
                if (validateStep()) setShowResult(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded"
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
              <h3 className="text-sm text-gray-500">No-Show-Rate (mtl.)</h3>
              <p className="text-xl font-semibold">{noshowRate}%</p>
            </div>
            <div className="bg-pink-50 border border-pink-300 p-4 rounded-xl">
              <h3 className="text-sm text-gray-500">No-Show-Umsatzverlust (30 Tage)</h3>
              <p className="text-xl font-semibold">
                {format(loss)} {currency}
              </p>
            </div>
            <div className="bg-white border p-4 rounded-xl">
              <h3 className="text-sm text-gray-500">Ø Auslastung (30 Tage)</h3>
              <p className="text-xl font-semibold">{occupancy.toFixed(1)}%</p>
            </div>
            <div className="bg-white border p-4 rounded-xl">
              <h3 className="text-sm text-gray-500">Gesamtumsatz (30 Tage)</h3>
              <p className="text-xl font-semibold">
                {format(totalRevenue)} {currency}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Dein Optimierungspotenzial</h3>
          <ul className="space-y-2">
            <li className="bg-green-50 border border-green-200 p-4 rounded-xl">
              No-Show-Rate aktuell: <strong>{noshowRate}%</strong>
            </li>
            <li className="bg-green-50 border border-green-200 p-4 rounded-xl">
              Umsatzverlust durch No-Shows pro Monat:{' '}
              <strong>
                {format(loss)} {currency}
              </strong>
            </li>
            <li className="bg-green-50 border border-green-200 p-4 rounded-xl">
              Potenzielle Mehreinnahmen durch besseres Tisch- und Gästemanagement (Upselling):{' '}
              <strong>
                {format(upsell)} – {format(upsell * 3)} {currency} pro Monat
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
                className="bg-blue-600 text-white px-4 py-2 rounded"
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
                className="bg-green-600 text-white px-4 py-2 rounded w-full disabled:opacity-60"
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