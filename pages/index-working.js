import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [formData, setFormData] = useState({
    country: '',
    restaurantType: '',
    seats: '',
    guestsPerDay: '',
    guestReservationRate: '',
    openDays: '',
    averageSpend: '',
    noShowGuestsLast30Days: '',
    hasOnlineReservation: '',
    reservationTool: '',
    customReservationTool: '',
    phoneToSystem: '',
    reservationRate: '',
    canModifyReservationOnline: '',
    requiresCreditCard: '',
    guestPlacementSystem: '',
    guestHistoryKnowledge: '',
    waitlist: '',
    feeForNoShow: '',
    posIntegration: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const currency = formData.country === 'Schweiz' ? 'CHF' : '€';

  const calculateLoss = () => formData.noShowGuestsLast30Days * formData.averageSpend;

  const generateRecommendations = () => {
    const recs = [];
    if (formData.feeForNoShow === 'Nein') recs.push('Erwäge, No-Show-Gebühren einzuführen.');
    if (formData.waitlist === 'Nein') recs.push('Nutze Wartelisten, um Ausfälle aufzufangen.');
    if (formData.reservationRate < 60) recs.push('Steigere die Online-Reservierungsquote durch bessere Website-Integration.');
    if (formData.noShowGuestsLast30Days >= 10) recs.push('Sende automatische Erinnerungen oder verlange Kreditkartenabsicherung.');
    return recs;
  };

  const totalGuestsPerMonth = formData.guestsPerDay * (formData.openDays * 4.35);
  const totalRevenue = totalGuestsPerMonth * formData.averageSpend;
  const totalReservations = totalGuestsPerMonth * (formData.guestReservationRate / 100);
  const noShowRate = totalReservations > 0 ? (formData.noShowGuestsLast30Days / totalReservations * 100).toFixed(1) : 0;
  const alenoNoShowRate = 0.5;
  const alenoNoShowLoss = 0;
  const upsellLow = ((+formData.guestsPerDay + +formData.noShowGuestsLast30Days) * 30) * formData.averageSpend * 0.05;
  const upsellHigh = ((+formData.guestsPerDay + +formData.noShowGuestsLast30Days) * 30) * formData.averageSpend * 0.15;
  const timeSavedSec = formData.guestPlacementSystem !== 'mit System' ? totalGuestsPerMonth * 15 : 0;

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="min-h-screen overflow-y-auto flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-xl w-full overflow-y-auto max-h-[80vh]">

        {!showResult && step === 1 && (
                    <form className="space-y-6">
            <h2 className="text-xl font-bold mb-4">A Betriebsdaten</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Land</label>
              <select name="country" value={formData.country} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                <option value="">Bitte wählen</option>
                <option value="Deutschland">Deutschland</option>
                <option value="Schweiz">Schweiz</option>
                <option value="Österreich">Österreich</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Restaurant-Typ</label>
              <select name="restaurantType" value={formData.restaurantType} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                <option value="">Bitte wählen</option>
                <option value="Casual">Casual</option>
                <option value="Fine Dining">Fine Dining</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sitzplätze</label>
              <input name="seats" value={formData.seats} onChange={handleChange} type="number" className="border border-gray-300 rounded p-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ø Gäste pro Tag</label>
              <input name="guestsPerDay" value={formData.guestsPerDay} onChange={handleChange} type="number" className="border border-gray-300 rounded p-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Wie viel % deiner Gäste reservieren vorab?</label>
              <input name="guestReservationRate" value={formData.guestReservationRate} onChange={handleChange} type="number" className="border border-gray-300 rounded p-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Anzahl Tage pro Woche geöffnet</label>
              <input name="openDays" value={formData.openDays} onChange={handleChange} type="number" className="border border-gray-300 rounded p-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ø Bon ({currency})</label>
              <input name="averageSpend" value={formData.averageSpend} onChange={handleChange} type="number" className="border border-gray-300 rounded p-2 w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Wie viele No-Shows in den letzten 30 Tagen?</label>
              <input name="noShowGuestsLast30Days" value={formData.noShowGuestsLast30Days} onChange={handleChange} type="number" className="border border-gray-300 rounded p-2 w-full" />
            </div>
            <button type="button" onClick={nextStep} className="bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-2 px-4 rounded w-full">Weiter</button>
          </form>
        )}

        {!showResult && step === 2 && (
          <form className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Reservierungssystem</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Online-Reservierungssystem im Einsatz?</label>
              <select name="hasOnlineReservation" value={formData.hasOnlineReservation} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                <option value="">Bitte wählen</option>
                <option value="Ja">Ja</option>
                <option value="Nein">Nein</option>
              </select>
            </div>
            {formData.hasOnlineReservation === 'Ja' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reservierungssystem</label>
                  <input name="reservationTool" value={formData.reservationTool} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Online-Reservierungsquote (%)</label>
                  <input name="reservationRate" value={formData.reservationRate} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefonische Reservierungen automatisch erfasst?</label>
                  <select name="phoneToSystem" value={formData.phoneToSystem} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gäste können online ändern/stornieren?</label>
                  <select name="canModifyReservationOnline" value={formData.canModifyReservationOnline} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kreditkartendaten bei Reservierung?</label>
                  <select name="requiresCreditCard" value={formData.requiresCreditCard} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </select>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <button type="button" onClick={prevStep} className="w-1/2 bg-gray-300 hover:bg-gray-400 transition text-black font-semibold py-2 px-4 rounded">Zurück</button>
              <button type="button" onClick={nextStep} className="w-1/2 bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-2 px-4 rounded">Weiter</button>
            </div>
          </form>
        )}

        {!showResult && step === 3 && (
          <form className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Systeme & Abläufe</h2>
            {formData.hasOnlineReservation === 'Ja' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reservierungssystem mit Kassensystem verbunden?</label>
                  <select name="posIntegration" value={formData.posIntegration} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Weißt du, was Stammgäste konsumiert haben?</label>
                  <select name="guestHistoryKnowledge" value={formData.guestHistoryKnowledge} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">No-Show-Gebühren erhoben?</label>
                  <select name="feeForNoShow" value={formData.feeForNoShow} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Warteliste vorhanden?</label>
              <select name="waitlist" value={formData.waitlist} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                <option value="">Bitte wählen</option>
                <option value="Ja">Ja</option>
                <option value="Nein">Nein</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gästeplatzierung</label>
              <select name="guestPlacementSystem" value={formData.guestPlacementSystem} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                <option value="">Bitte wählen</option>
                <option value="manuell">Manuell</option>
                <option value="mit System">Mit System-Unterstützung</option>
              </select>
            </div>
            <div className="flex justify-between gap-4">
              <button type="button" onClick={prevStep} className="w-1/2 bg-gray-300 hover:bg-gray-400 transition text-black font-semibold py-2 px-4 rounded">Zurück</button>
              <button type="button" onClick={() => setShowResult(true)} className="w-1/2 bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-2 px-4 rounded">Auswertung</button>
            </div>
          </form>
        )}

        {showResult && (
          <div className="mt-10 space-y-8">
            <div className="text-right">
              <button onClick={() => alert(JSON.stringify(formData, null, 2))} className="text-sm text-blue-600 hover:underline">
                Eingaben ansehen
              </button>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-center">Dein Ergebnis</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white shadow-lg rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500">Umsatzverlust durch No-Shows</h3>
                <p className="text-xl font-semibold">{calculateLoss().toFixed(2)} {currency}</p>
              </div>
              <div className="bg-white shadow-lg rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500">Gesamtumsatz (30 Tage)</h3>
                <p className="text-xl font-semibold">{totalRevenue.toFixed(2)} {currency}</p>
              </div>
              <div className="bg-white shadow-lg rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500">No-Show-Rate</h3>
                <p className="text-xl font-semibold">{noShowRate}%</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-6">Potenziale mit aleno</h3>
            <ul className="space-y-2">
              <li className="bg-blue-50 border border-blue-200 p-4 rounded-xl">No-Show-Rate mit aleno: <strong>{alenoNoShowRate}%</strong></li>
              <li className="bg-blue-50 border border-blue-200 p-4 rounded-xl">Umsatzverlust mit aleno: <strong>{alenoNoShowLoss.toFixed(2)} {currency}</strong></li>
              <li className="bg-blue-50 border border-blue-200 p-4 rounded-xl">Upselling-Potenzial: <strong>{upsellLow.toFixed(0)} – {upsellHigh.toFixed(0)} {currency}</strong></li>
              {timeSavedSec > 0 && (
                <li className="bg-blue-50 border border-blue-200 p-4 rounded-xl">Zeitersparnis durch Tischzuweisung: <strong>{(timeSavedSec / 60).toFixed(0)} Minuten / Monat</strong></li>
              )}
            </ul>

            <h3 className="text-lg font-semibold mt-6">Empfehlungen</h3>
            <ul className="list-disc list-inside text-gray-700">
              {generateRecommendations().map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>

            <button onClick={() => { setStep(1); setShowResult(false); }} className="mt-6 bg-gray-300 hover:bg-gray-400 transition p--2 rounded w-full">
              Neue Berechnung starten
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
