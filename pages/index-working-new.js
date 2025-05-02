// Trigger redeploy

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

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
    posIntegration: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const currency = formData.country === 'Schweiz' ? 'CHF' : '€';
  const calculateLoss = () => formData.noShowGuestsLast30Days * formData.averageSpend;

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-xl w-full">

        {!showResult && step === 1 && (
          <form className="space-y-6">
            <h1 className="text-2xl font-bold mb-4">No-Show Rechner</h1>
            <p>Finde heraus, wie hoch dein Umsatzverlust durch No-Shows ist und was du konkret tun kannst.</p>
            <h2 className="text-xl font-bold mb-4">Allgemeine Angaben</h2>

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
                <option value="Fast Casual">Fast Casual</option>
                <option value="Hotelrestaurant">Hotelrestaurant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Anzahl Sitzplätze</label>
              <input name="seats" value={formData.seats} onChange={handleChange} type="number" min="0" className="border border-gray-300 rounded p-2 w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ø Gäste pro Tag</label>
              <input name="guestsPerDay" value={formData.guestsPerDay} onChange={handleChange} type="number" min="0" className="border border-gray-300 rounded p-2 w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Wie viel % deiner Gäste reservieren vorab?</label>
              <input name="guestReservationRate" value={formData.guestReservationRate} onChange={handleChange} type="number" min="0" max="100" className="border border-gray-300 rounded p-2 w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Anzahl Tage pro Woche geöffnet</label>
              <input name="openDays" value={formData.openDays} onChange={handleChange} type="number" min="1" max="7" className="border border-gray-300 rounded p-2 w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ø Bon ({currency})</label>
              <input name="averageSpend" value={formData.averageSpend} onChange={handleChange} type="number" min="0" className="border border-gray-300 rounded p-2 w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Wie viele No-Shows in den letzten 30 Tagen?</label>
              <input name="noShowGuestsLast30Days" value={formData.noShowGuestsLast30Days} onChange={handleChange} type="number" min="0" className="border border-gray-300 rounded p-2 w-full" />
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={nextStep} className="bg-blue-600 text-white px-4 py-2 rounded">Weiter</button>
            </div>
          </form>
        )}

{!showResult && step === 2 && (
          <form className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Reservierungen & Systeme</h2>

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
                  <label className="block text-sm font-medium text-gray-700">Welches Reservierungssystem?</label>
                  <select name="reservationTool" value={formData.reservationTool} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="aleno">aleno</option>
                    <option value="CentralPlanner">CentralPlanner</option>
                    <option value="Formitable">Formitable</option>
                    <option value="Foratable">Foratable</option>
                    <option value="Gastronovi">Gastronovi</option>
                    <option value="OpenTable">OpenTable</option>
                    <option value="Quandoo">Quandoo</option>
                    <option value="Resmio">Resmio</option>
                    <option value="Seatris">Seatris</option>
                    <option value="Tablein">Tablein</option>
                    <option value="The Fork">The Fork</option>
                    <option value="Zenchef">Zenchef</option>
                    <option value="ein anderes">ein anderes</option>
                  </select>
                </div>

                {formData.reservationTool === 'ein anderes' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Anderes System (bitte angeben)</label>
                    <input name="customReservationTool" value={formData.customReservationTool} onChange={handleChange} type="text" className="border border-gray-300 rounded p-2 w-full" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Werden telefonische Reservierungen automatisch im System erfasst?</label>
                  <select name="phoneToSystem" value={formData.phoneToSystem} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full">
                    <option value="">Bitte wählen</option>
                    <option value="Ja">Ja</option>
                    <option value="Nein">Nein</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Online-Reservierungsquote (%)</label>
                  <input name="reservationRate" value={formData.reservationRate} onChange={handleChange} type="number" min="0" max="100" className="border border-gray-300 rounded p-2 w-full" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Können Gäste online ändern/stornieren?</label>
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

            <div className="flex justify-between">
              <button type="button" onClick={prevStep} className="bg-gray-300 text-black px-4 py-2 rounded">Zurück</button>
              <button type="button" onClick={nextStep} className="bg-blue-600 text-white px-4 py-2 rounded">Weiter</button>
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
                  <label className="block text-sm font-medium text-gray-700">Kennst du die Konsumationen von Stammgästen?</label>
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

            <div className="flex justify-between">
              <button type="button" onClick={prevStep} className="bg-gray-300 text-black px-4 py-2 rounded">Zurück</button>
              <button type="button" onClick={() => setShowResult(true)} className="bg-green-600 text-white px-4 py-2 rounded">Auswertung anzeigen</button>
            </div>
          </form>
        )}

        {showResult && (
          <div className="mt-10 space-y-8">
            <h2 className="text-2xl font-bold text-center mb-6">Dein Ergebnis</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white shadow-lg rounded-xl p-4">
                <h3 className="text-sm text-gray-500">Ø Auslastung (30 Tage)</h3>
                <p className="text-xl font-semibold">
                  {(((+formData.guestsPerDay * formData.openDays * 4.35) / (+formData.seats * formData.openDays * 4.35)) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-white shadow-lg rounded-xl p-4">
                <h3 className="text-sm text-gray-500">Umsatzverlust durch No-Shows</h3>
                <p className="text-xl font-semibold">{calculateLoss().toFixed(2)} {currency}</p>
              </div>
              <div className="bg-white shadow-lg rounded-xl p-4">
                <h3 className="text-sm text-gray-500">Gesamtumsatz (30 Tage)</h3>
                <p className="text-xl font-semibold">{totalRevenue.toFixed(2)} {currency}</p>
              </div>
              <div className="bg-white shadow-lg rounded-xl p-4">
                <h3 className="text-sm text-gray-500">No-Show-Rate</h3>
                <p className="text-xl font-semibold">{noShowRate}%</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-6">Dein Optimierungspotenzial</h3>
            <ul className="space-y-2">
              <li className="bg-pink-50 border border-pink-200 p-4 rounded-xl">No-Show-Rate: <strong>0,5%</strong></li>
              <li className="bg-pink-50 border border-pink-200 p-4 rounded-xl">Umsatzverlust durch No-Shows: <strong>0 {currency}</strong></li>
              <li className="bg-pink-50 border border-pink-200 p-4 rounded-xl">Umsatzsteigerung durch personalisiertes Upselling: <strong>{upsellLow.toFixed(0)} – {upsellHigh.toFixed(0)} {currency}</strong></li>
              {timeSavedSec > 0 && (
                <li className="bg-pink-50 border border-pink-200 p-4 rounded-xl">Zeitersparnis durch automatisierte Tischzuweisung: <strong>{(timeSavedSec / 60).toFixed(0)} Minuten / Monat</strong></li>
              )}
              {formData.hasOnlineReservation !== 'Ja' && (
                <li className="bg-pink-50 border border-pink-200 p-4 rounded-xl">Auslastungssteigerung: <strong>+15%</strong></li>
              )}
            </ul>

            <div className="mt-6 text-center">
              <p className="mb-2 font-semibold">Möchtest du einen PDF-Report mit individuell auf deinen Betrieb zugeschnittenen Handlungsempfehlungen?</p>
              <button onClick={() => setShowContactForm(true)} className="bg-blue-500 text-white px-4 py-2 rounded">Ja, Report erhalten</button>
            </div>

            {showContactForm && (
              <form className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vorname</label>
                  <input name="firstName" value={formData.firstName} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nachname</label>
                  <input name="lastName" value={formData.lastName} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">E-Mail</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile-Nummer</label>
                  <input name="mobile" type="tel" value={formData.mobile} onChange={handleChange} className="border border-gray-300 rounded p-2 w-full" required />
                </div>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded w-full">PDF-Report anfordern</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
