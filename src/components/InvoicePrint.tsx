import { invoiceStatusLabels, type AppSettings, type Invoice } from '../domain/invoice'
import { getInvoiceHighlights, getInvoiceTerms, getInvoiceTitle, getTotalLabel } from '../domain/invoiceContent'
import { formatInr } from '../domain/pricing'

export const InvoicePrint = ({ invoice, settings }: { invoice: Invoice; settings: AppSettings }) => {
  const upiValue = settings.upiId
    ? `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.upiPayeeName)}&am=${invoice.pricing.total}&cu=INR&tn=${encodeURIComponent(invoice.invoiceNumber)}`
    : ''
  const terms = getInvoiceTerms(invoice)
  const highlights = getInvoiceHighlights(invoice)

  return (
    <article className="print-page text-sm">
      <header className="flex items-start justify-between gap-8 border-b-2 border-emerald-900 pb-5">
        <div>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.brandName} className="h-20 w-auto max-w-[390px] object-contain object-left" />
          ) : (
            <p className="text-3xl font-black tracking-normal text-slate-950">{settings.brandName}</p>
          )}
          <div className="mt-3 text-xs leading-relaxed text-slate-600">
            <p>Call/WhatsApp: {settings.phone}</p>
            <p>{settings.website}</p>
          </div>
        </div>
        <div className="min-w-44 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">{getInvoiceTitle(invoice)}</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-slate-600">{formatDate(invoice.invoiceDate)}</p>
          <p className="mt-3 inline-flex rounded-md bg-slate-950 px-3 py-1 text-xs font-bold text-white">
            {invoiceStatusLabels[invoice.status]}
          </p>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-3 gap-2 border-b border-stone-200 pb-4 text-center text-[11px] font-semibold text-emerald-900">
        {highlights.map((highlight) => (
          <p key={highlight} className="rounded-md bg-emerald-50 px-2 py-2">{highlight}</p>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Bill To</h2>
          <p className="mt-3 text-lg font-semibold text-slate-950">{invoice.customer.name || 'Customer name'}</p>
          <p className="text-slate-600">{invoice.customer.phone}</p>
        </div>
        <div className="rounded-md border border-stone-200 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Price Error Details</p>
          <p className="mt-3 font-semibold text-slate-950">Quotation validity: 24 hours</p>
          <p className="mt-1 text-slate-600">Payment after booking confirmation only</p>
          <p className="mt-1 text-slate-600">Support: {settings.phone}</p>
        </div>
      </section>

      {invoice.invoiceType === 'DigitalService' ? (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Digital Service</h2>
          <table className="mt-3 w-full border-collapse">
            <tbody>
              <PriceRow label="Item Name" value={invoice.digitalService?.itemName || 'Digital service'} />
            </tbody>
          </table>
        </section>
      ) : (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Flight Itinerary</h2>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr className="bg-stone-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="border border-stone-200 px-3 py-2">From</th>
                <th className="border border-stone-200 px-3 py-2">To</th>
                <th className="border border-stone-200 px-3 py-2">Departure</th>
                <th className="border border-stone-200 px-3 py-2">Return</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stone-200 px-3 py-3">{invoice.flight.origin}</td>
                <td className="border border-stone-200 px-3 py-3">{invoice.flight.destination}</td>
                <td className="border border-stone-200 px-3 py-3">{formatDate(invoice.flight.departureDate)}</td>
                <td className="border border-stone-200 px-3 py-3">{invoice.flight.returnDate ? formatDate(invoice.flight.returnDate) : 'N/A'}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-slate-700">
            {invoice.flight.airline || 'Airline TBC'} | {invoice.flight.travelClass} | {invoice.flight.passengerCount} passenger(s)
          </p>
          {invoice.flight.passengerNames ? <p className="mt-1 text-slate-600">Passengers: {invoice.flight.passengerNames}</p> : null}
        </section>
      )}

      <section className="mt-7 grid gap-6 lg:grid-cols-[1fr_170px]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {invoice.invoiceType === 'DigitalService' ? 'Price Summary' : 'Fare Summary'}
          </h2>
          <table className="mt-3 w-full border-collapse">
            <tbody>
              <PriceRow label={invoice.invoiceType === 'DigitalService' ? 'Total Price' : 'Total Fare'} value={invoice.pricing.totalFare} />
              {invoice.invoiceType === 'FlightTicket' ? (
                <>
                  <PriceRow label={`Discount (${invoice.pricing.discountPercentage}%)`} value={-invoice.pricing.discountAmount} />
                  <PriceRow label="Total Passengers" value={`${invoice.flight.passengerCount}`} />
                </>
              ) : null}
              <tr className="bg-slate-950 text-white">
                <td className="px-3 py-3 text-base font-bold">{getTotalLabel(invoice).toUpperCase()}</td>
                <td className="px-3 py-3 text-right text-base font-bold">{formatInr(invoice.pricing.total)}</td>
              </tr>
              {invoice.invoiceType === 'FlightTicket' && invoice.pricing.advancePayment > 0 && (
                <>
                  <tr className="bg-emerald-50">
                    <td className="border border-stone-200 px-3 py-2 font-semibold text-emerald-800">Advance Payment Received</td>
                    <td className="border border-stone-200 px-3 py-2 text-right font-semibold text-emerald-800">{formatInr(invoice.pricing.advancePayment)}</td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="border border-stone-200 px-3 py-2 font-bold text-orange-800">BALANCE PENDING</td>
                    <td className="border border-stone-200 px-3 py-2 text-right font-bold text-orange-800">{formatInr(Math.max(0, invoice.pricing.total - invoice.pricing.advancePayment))}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        {upiValue ? (
          <div className="self-start rounded-md border border-stone-200 p-3 text-center">
            <p className="text-xs font-semibold text-slate-950">UPI Payment</p>
            <p className="mt-2 break-all text-[11px] text-slate-500">{settings.upiId}</p>
            <p className="mt-2 text-[10px] leading-snug text-slate-500">Open payment app and use this UPI ID.</p>
          </div>
        ) : null}
      </section>

      <section className="mt-7 rounded-md border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-bold text-slate-950">Terms & Conditions - Please Read Before Payment</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-700">
          {terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
      </section>

      <footer className="mt-8 flex items-end justify-between border-t border-stone-200 pt-5 text-xs text-slate-500">
        <div>
          <div className="mb-2 h-px w-48 bg-slate-400" />
          <p className="font-semibold text-slate-700">Authorized by Price Error</p>
          <p>No backend payment gateway or auto-cancellation is implied by this document.</p>
        </div>
        <div className="text-right">
          <p>Generated: {new Date().toLocaleString('en-IN')}</p>
          <p>This is a computer-generated document.</p>
        </div>
      </footer>
    </article>
  )
}

const PriceRow = ({ label, value }: { label: string; value: number | string }) => (
  <tr>
    <td className="border border-stone-200 px-3 py-2">{label}</td>
    <td className="border border-stone-200 px-3 py-2 text-right">
      {typeof value === 'number' ? (value < 0 ? `- ${formatInr(Math.abs(value))}` : formatInr(value)) : value}
    </td>
  </tr>
)

const formatDate = (date: string) => {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-IN').format(new Date(`${date}T00:00:00`))
}
