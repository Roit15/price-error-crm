import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { Check, Loader2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Panel, TextField, SelectField } from '../components/ui/FormControls'
import { invoiceStatuses, invoiceStatusLabels, invoiceTypeLabels, invoiceTypes, travelClasses, digitalServiceItems, type Invoice } from '../domain/invoice'
import { formatInr } from '../domain/pricing'
import { invoiceRepository } from '../persistence/invoiceRepository'
import { createEmptyInvoice, saveInvoiceDraft, type InvoiceDraftInput } from '../services/invoiceService'

const invoiceFormSchema = z.object({
  invoiceType: z.enum(invoiceTypes),
  status: z.enum(invoiceStatuses),
  customer: z.object({
    name: z.string().trim().min(1, 'Customer name is required'),
    phone: z.string().trim().min(1, 'Phone number is required'),
  }),
  flight: z.object({
    origin: z.string().trim().optional(),
    destination: z.string().trim().optional(),
    departureDate: z.string().optional(),
    returnDate: z.string().optional(),
    airline: z.string().optional(),
    travelClass: z.enum(travelClasses),
    passengerCount: z.coerce.number().int().min(1, 'At least one passenger is required'),
    passengerNames: z.string().optional(),
  }),
  digitalService: z.object({
    itemName: z.string().trim().optional(),
  }),
  pricing: z.object({
    totalFare: z.coerce.number().min(0),
    discountPercentage: z.coerce.number().min(0).max(100),
    advancePayment: z.coerce.number().min(0).optional(),
  }),
}).superRefine((values, context) => {
  if (values.invoiceType === 'DigitalService') {
    if (!values.digitalService.itemName?.trim()) {
      context.addIssue({
        code: 'custom',
        message: 'Item name is required',
        path: ['digitalService', 'itemName'],
      })
    }
    return
  }

  if (!values.flight.origin?.trim()) {
    context.addIssue({ code: 'custom', message: 'Origin is required', path: ['flight', 'origin'] })
  }
  if (!values.flight.destination?.trim()) {
    context.addIssue({ code: 'custom', message: 'Destination is required', path: ['flight', 'destination'] })
  }
  if (!values.flight.departureDate) {
    context.addIssue({ code: 'custom', message: 'Departure date is required', path: ['flight', 'departureDate'] })
  }
})

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export const InvoiceFormPage = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const invoiceRef = useRef<Invoice | null>(null)
  const [saveState, setSaveState] = useState<'loading' | 'saving' | 'saved'>('loading')

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema) as Resolver<InvoiceFormValues>,
    mode: 'onBlur',
  })

  const watchedValues = useWatch({ control: form.control })
  const invoiceType = watchedValues.invoiceType ?? 'FlightTicket'
  const finalPriceRef = useRef<HTMLInputElement>(null)
  const lastPricingEdit = useRef<'discount' | 'final'>('discount')

  const computedTotal = useMemo(() => {
    const pricing = watchedValues.pricing
    const totalFare = Number(pricing?.totalFare || 0)
    const discountPercentage = Number(pricing?.discountPercentage || 0)
    return Math.max(0, totalFare - Math.round(totalFare * (discountPercentage / 100)))
  }, [watchedValues])

  // Sync final price input when total fare or discount % changes
  useEffect(() => {
    if (lastPricingEdit.current === 'final') return
    if (finalPriceRef.current) {
      finalPriceRef.current.value = String(computedTotal)
    }
  }, [computedTotal])

  const handleFinalPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    lastPricingEdit.current = 'final'
    const totalFare = Number(watchedValues.pricing?.totalFare || 0)
    const finalPrice = Number(e.target.value || 0)
    if (totalFare <= 0) return
    const pct = Math.max(0, Math.min(100, ((totalFare - finalPrice) / totalFare) * 100))
    const rounded = Math.round(pct * 100) / 100
    form.setValue('pricing.discountPercentage', rounded, { shouldDirty: true })
    // Reset flag after a tick so the useEffect above doesn't overwrite
    requestAnimationFrame(() => { lastPricingEdit.current = 'discount' })
  }, [watchedValues.pricing?.totalFare, form])

  const handleDiscountChange = useCallback(() => {
    lastPricingEdit.current = 'discount'
  }, [])

  useEffect(() => {
    const loadInvoice = async () => {
      const loadedInvoice = invoiceId ? await invoiceRepository.get(invoiceId) : await createEmptyInvoice()
      if (!loadedInvoice) {
        navigate('/invoices', { replace: true })
        return
      }

      if (!invoiceId) {
        await invoiceRepository.save(loadedInvoice)
      }

      invoiceRef.current = loadedInvoice
      setInvoice(loadedInvoice)
      form.reset(toFormValues(loadedInvoice))
      setSaveState('saved')
    }

    void loadInvoice()
  }, [form, invoiceId, navigate])

  useEffect(() => {
    const currentInvoice = invoiceRef.current
    if (!currentInvoice) return
    const timer = window.setTimeout(async () => {
      setSaveState('saving')
      const nextInvoice = await saveInvoiceDraft(currentInvoice, normalizeFormValues(watchedValues as PartialInvoiceFormValues))
      invoiceRef.current = nextInvoice
      setInvoice(nextInvoice)
      setSaveState('saved')
    }, 500)

    return () => window.clearTimeout(timer)
  }, [watchedValues])

  const saveAndPreview = form.handleSubmit(async (values) => {
    if (!invoice) return
    const savedInvoice = await saveInvoiceDraft(invoice, normalizeFormValues(values))
    navigate(`/invoices/${savedInvoice.id}/preview`)
  })

  return (
    <>
      <PageHeader
        eyebrow={invoice?.invoiceNumber}
        title={invoiceId ? 'Edit invoice' : 'New invoice'}
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <button
              type="button"
              onClick={() => void saveAndPreview()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5"
            >
              Preview
            </button>
          </div>
        }
      />
      <form className="animate-slide-up grid gap-4 pb-24 sm:gap-5 xl:grid-cols-[1fr_320px] xl:pb-0" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-5">
          <Panel title="Customer details">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Invoice type" {...form.register('invoiceType')}>
                {invoiceTypes.map((type) => (
                  <option key={type} value={type}>
                    {invoiceTypeLabels[type]}
                  </option>
                ))}
              </SelectField>
              <TextField label="Customer name" error={form.formState.errors.customer?.name?.message} {...form.register('customer.name')} />
              <TextField label="Phone number" error={form.formState.errors.customer?.phone?.message} {...form.register('customer.phone')} />
              <SelectField label="Status" {...form.register('status')}>
                {invoiceStatuses.map((status) => (
                  <option key={status} value={status}>
                    {invoiceStatusLabels[status]}
                  </option>
                ))}
              </SelectField>
            </div>
          </Panel>

          <div key={invoiceType} className="animate-scale-in">
            {invoiceType === 'DigitalService' ? (
              <Panel title="Digital service">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Item name"
                    error={form.formState.errors.digitalService?.itemName?.message}
                    list="digital-service-items"
                    autoComplete="off"
                    {...form.register('digitalService.itemName')}
                  />
                  <datalist id="digital-service-items">
                    {digitalServiceItems.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>
              </Panel>
            ) : (
              <Panel title="Flight itinerary">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Origin city / airport" error={form.formState.errors.flight?.origin?.message} {...form.register('flight.origin')} />
                  <TextField
                    label="Destination city / airport"
                    error={form.formState.errors.flight?.destination?.message}
                    {...form.register('flight.destination')}
                  />
                  <TextField
                    label="Departure date"
                    type="date"
                    error={form.formState.errors.flight?.departureDate?.message}
                    {...form.register('flight.departureDate')}
                  />
                  <TextField label="Return date" type="date" {...form.register('flight.returnDate')} />
                  <TextField label="Airline" {...form.register('flight.airline')} />
                  <SelectField label="Class" {...form.register('flight.travelClass')}>
                    {travelClasses.map((travelClass) => (
                      <option key={travelClass} value={travelClass}>
                        {travelClass}
                      </option>
                    ))}
                  </SelectField>
                  <TextField
                    label="Number of passengers"
                    type="number"
                    min={1}
                    error={form.formState.errors.flight?.passengerCount?.message}
                    {...form.register('flight.passengerCount', { valueAsNumber: true })}
                  />
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold text-slate-600">Passenger names</span>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                      placeholder="Optional comma-separated list"
                      {...form.register('flight.passengerNames')}
                    />
                  </label>
                </div>
              </Panel>
            )}
          </div>

          <Panel title={invoiceType === 'DigitalService' ? 'Service price' : 'Fare summary'}>
            {invoiceType === 'FlightTicket' ? (
              <div className="grid gap-4 md:grid-cols-3">
                <TextField label="Total fare" type="number" min={0} {...form.register('pricing.totalFare', { valueAsNumber: true })} />
                <div>
                  <TextField
                    label="Discount %"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    {...form.register('pricing.discountPercentage', { valueAsNumber: true, onChange: handleDiscountChange })}
                  />
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-600">Final price</span>
                  <input
                    ref={finalPriceRef}
                    type="number"
                    min={0}
                    defaultValue={computedTotal}
                    onChange={handleFinalPriceChange}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                  />
                </label>
                {computedTotal > 0 && Number(watchedValues.pricing?.discountPercentage || 0) > 0 && (
                  <p className="md:col-span-3 text-xs text-slate-500">
                    Discount of <span className="font-bold text-slate-700">{formatInr(Number(watchedValues.pricing?.totalFare || 0) - computedTotal)}</span> applied ({watchedValues.pricing?.discountPercentage}%)
                  </p>
                )}
                <div className="md:col-span-3 mt-1 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <TextField
                      label="Advance payment received"
                      type="number"
                      min={0}
                      max={computedTotal}
                      placeholder="0"
                      {...form.register('pricing.advancePayment', { valueAsNumber: true })}
                    />
                  </div>
                  {Number(watchedValues.pricing?.advancePayment || 0) > 0 && (
                    <p className="mt-2 text-sm font-bold text-emerald-700">
                      Pending: {formatInr(Math.max(0, computedTotal - Number(watchedValues.pricing?.advancePayment || 0)))}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Total price" type="number" min={0} {...form.register('pricing.totalFare', { valueAsNumber: true })} />
              </div>
            )}
          </Panel>
        </div>

        <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] xl:sticky xl:top-6 xl:h-fit xl:rounded-xl xl:border-0 xl:bg-gradient-to-br xl:from-slate-950 xl:to-slate-900 xl:p-5 xl:text-white xl:shadow-xl">
          <p className="text-sm font-medium text-slate-500 xl:text-slate-400">{invoiceType === 'DigitalService' ? 'Total invoice' : 'Total quotation'}</p>
          <p className="mt-1 text-2xl font-black text-slate-950 xl:mt-2 xl:text-3xl xl:text-white">{formatInr(computedTotal)}</p>
          <dl className="mt-5 hidden space-y-3 text-sm text-slate-400 xl:block">
            <div className="flex justify-between gap-3">
              <dt>Invoice</dt>
              <dd className="font-bold text-white">{invoice?.invoiceNumber}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Validity</dt>
              <dd className="font-bold text-white">24 hours</dd>
            </div>
            {invoiceType === 'FlightTicket' && Number(watchedValues.pricing?.advancePayment || 0) > 0 && (
              <>
                <div className="flex justify-between gap-3">
                  <dt>Advance paid</dt>
                  <dd className="font-bold text-emerald-400">{formatInr(Number(watchedValues.pricing?.advancePayment || 0))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Pending</dt>
                  <dd className="font-bold text-orange-400">{formatInr(Math.max(0, computedTotal - Number(watchedValues.pricing?.advancePayment || 0)))}</dd>
                </div>
              </>
            )}
          </dl>
          <button
            type="button"
            onClick={() => void saveAndPreview()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30 xl:mt-6 xl:py-2"
          >
            Save & preview
          </button>
        </aside>
      </form>
    </>
  )
}

/* ─── Save Indicator ─── */
const SaveIndicator = ({ state }: { state: 'loading' | 'saving' | 'saved' }) => {
  if (state === 'loading') return <span className="text-sm text-slate-400">Loading...</span>
  if (state === 'saving')
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
        <Loader2 size={14} className="animate-spin" />
        Saving
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
      <Check size={14} />
      Saved
    </span>
  )
}

const toFormValues = (invoice: Invoice): InvoiceFormValues => ({
  invoiceType: invoice.invoiceType ?? 'FlightTicket',
  status: invoice.status,
  customer: invoice.customer,
  flight: invoice.flight,
  digitalService: invoice.digitalService ?? { itemName: '' },
  pricing: {
    totalFare: invoice.pricing.totalFare ?? 0,
    discountPercentage: invoice.pricing.discountPercentage ?? 0,
    advancePayment: invoice.pricing.advancePayment ?? 0,
  },
})

type PartialInvoiceFormValues = {
  invoiceType?: InvoiceFormValues['invoiceType']
  status?: InvoiceFormValues['status']
  customer?: Partial<InvoiceFormValues['customer']>
  flight?: Partial<InvoiceFormValues['flight']>
  digitalService?: Partial<InvoiceFormValues['digitalService']>
  pricing?: Partial<InvoiceFormValues['pricing']>
}

const normalizeFormValues = (values: PartialInvoiceFormValues): InvoiceDraftInput => ({
  invoiceType: values.invoiceType ?? 'FlightTicket',
  status: values.status ?? 'Draft',
  customer: {
    name: values.customer?.name ?? '',
    phone: values.customer?.phone ?? '',
  },
  flight: {
    origin: values.flight?.origin ?? '',
    destination: values.flight?.destination ?? '',
    departureDate: values.flight?.departureDate ?? '',
    returnDate: values.flight?.returnDate ?? '',
    airline: values.flight?.airline ?? '',
    travelClass: values.flight?.travelClass ?? 'Economy',
    passengerCount: Number(values.flight?.passengerCount || 1),
    passengerNames: values.flight?.passengerNames ?? '',
  },
  digitalService: {
    itemName: values.digitalService?.itemName ?? '',
  },
  pricing: {
    totalFare: Number(values.pricing?.totalFare || 0),
    discountPercentage: values.invoiceType === 'DigitalService' ? 0 : Number(values.pricing?.discountPercentage || 0),
    advancePayment: values.invoiceType === 'DigitalService' ? 0 : Number(values.pricing?.advancePayment || 0),
  },
})
