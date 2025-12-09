import { useEffect, useRef, useState } from 'react';

// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    avgReservationsPerDay: '',
    avgGuestsPerReservation: '2',
    noShowsLast30Days: '',
    restaurantType: '',
    openDaysPerWeek: '',
    revenuePerGuest: '',
    hasOnlineReservation: '',
    reservationTool: '',
    customReservationTool: '',
    chargesNoShowFee: '',
    noShowFee: '',
    firstName: '',
    lastName: '',
    email: '',
    restaurantName: '',
  });
  const [showResult, setShowResult] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < 3 || (step === 3 && formData.hasOnlineReservation === 'Ja')) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const calculateLoss = () => {
    const revenuePerGuest = parseFloat(formData.revenuePerGuest) || 0;
    const noShows = parseFloat(formData.noShowsLast30Days) || 0;
    return (noShows * revenuePerGuest).toFixed(2);
  };

  const calculateNoShowRate = () => {
    const resPerDay = parseFloat(formData.avgReservationsPerDay) || 0;
    const guestsPerRes = parseFloat(formData.avgGuestsPerReservation) || 0;
    const openDays = parseFloat(formData.openDaysPerWeek) || 0;
    const totalGuests = resPerDay * guestsPerRes * openDays * 4.3;
    const noShows = parseFloat(formData.noShowsLast30Days) || 0;
    return totalGuests ? ((noShows / totalGuests) * 100).toFixed(1) + '%' : '0%';
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">No-Show Rechner</h1>
      {!showResult && (
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div>
              <label>Ø Reservierungen pro Öffnungstag</label>
              <input type="number" name="avgReservationsPerDay" value={formData.avgReservationsPerDay} onChange={handleChange} required className="w-full border p-2 mb-4" />

              <label>Ø Gäste pro Reservierung</label>
              <input type="number" name="avgGuestsPerReservation" value={formData.avgGuestsPerReservation} onChange={handleChange} required className="w-full border p-2 mb-4" />

              <label>No-Shows in den letzten 30 Tagen</label>
              <input type="number" name="noShowsLast30Days" value={formData.noShowsLast30Days} onChange={handleChange} required className="w-full border p-2 mb-4" />
            </div>
          )}

          {step === 2 && (
            <div>
              <label>Restaurant-Typ</label>
              <select name="restaurantType" value={formData.restaurantType} onChange={handleChange} required className="w-full border p-2 mb-4">
                <option value="">Bitte wählen</option>
                <option value="à la carte">à la carte</option>
                <option value="Casual Dining">Casual Dining</option>
                <option value="Fine Dining">Fine Dining</option>
                <option value="Hotelrestaurant">Hotelrestaurant</option>
                <option value="Systemgastronomie">Systemgastronomie</option>
              </select>

              <label>Anzahl Tage pro Woche geöffnet</label>
              <input type="number" min="1" max="7" name="openDaysPerWeek" value={formData.openDaysPerWeek} onChange={handleChange} required className="w-full border p-2 mb-4" />

              <label>Umsatz pro Gast (€)</label>
              <input type="number" min="1" max="500" name="revenuePerGuest" value={formData.revenuePerGuest} onChange={handleChange} required className="w-full border p-2 mb-4" />

              <label>Ist ein Online-Reservierungssystem im Einsatz?</label>
              <select name="hasOnlineReservation" value={formData.hasOnlineReservation} onChange={handleChange} required className="w-full border p-2 mb-4">
                <option value="">Bitte wählen</option>
                <option value="Ja">Ja</option>
                <option value="Nein">Nein</option>
              </select>
            </div>
          )}

          {step === 3 && formData.hasOnlineReservation === 'Ja' && (
            <div>
              <label>Welches Reservierungssystem?</label>
              <select name="reservationTool" value={formData.reservationTool} onChange={handleChange} required className="w-full border p-2 mb-4">
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

              {formData.reservationTool === 'ein anderes' && (
                <input type="text" name="customReservationTool" placeholder="Bitte angeben" value={formData.customReservationTool} onChange={handleChange} className="w-full border p-2 mb-4" />
              )}

              <label>Werden No-Show-Gebühren erhoben?</label>
              <select name="chargesNoShowFee" value={formData.chargesNoShowFee} onChange={handleChange} required className="w-full border p-2 mb-4">
                <option value="">Bitte wählen</option>
                <option value="Ja">Ja</option>
                <option value="Nein">Nein</option>
              </select>

              {formData.chargesNoShowFee === 'Ja' && (
                <input type="number" name="noShowFee" value={formData.noShowFee} onChange={handleChange} placeholder="No-Show-Gebühr pro Gast (€)" required className="w-full border p-2 mb-4" />
              )}
            </div>
          )}

          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {step < 3 || (step === 3 && formData.hasOnlineReservation === 'Ja') ? 'Weiter' : 'Auswertung anzeigen'}
          </button>
        </form>
      )}

      {showResult && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Deine Auswertung</h2>

          <div className="bg-black text-white p-4 rounded mb-4">
            <p className="text-lg font-semibold">No-Show-Rate (30 Tage): {calculateNoShowRate()}</p>
          </div>
          <div className="bg-black text-white p-4 rounded mb-4">
            <p className="text-lg font-semibold">No-Show-Verlust (30 Tage): {calculateLoss()} €</p>
          </div>

          <button onClick={() => setShowContactForm(true)} className="bg-green-600 text-white px-4 py-2 rounded">
            Ja, PDF-Report erhalten
          </button>

          {showContactForm && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Kontaktdaten</h3>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Vorname" required className="w-full border p-2 mb-2" />
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Nachname" required className="w-full border p-2 mb-2" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Business-Email" pattern="^[\w.%+-]+@(?:[\w-]+\.)+(?:com|org|de|ch|at)$" required className="w-full border p-2 mb-2" />
              <input type="text" name="restaurantName" value={formData.restaurantName} onChange={handleChange} placeholder="Name des Restaurants" required className="w-full border p-2 mb-2" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
