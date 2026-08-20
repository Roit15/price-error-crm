import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { PageHeader } from '../components/PageHeader'
import { Panel, SelectField, TextField } from '../components/ui/FormControls'
import { createEmptyInvoice, saveInvoiceDraft } from '../services/invoiceService'

const cultFitFormSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  customerPhone: z.string().trim().min(1, 'Phone number is required'),
  total: z.coerce.number().min(0, 'Total must be positive'),
  status: z.enum(['VoucherGeneratedPaymentPending', 'PaymentDone']),
})

type CultFitFormValues = z.infer<typeof cultFitFormSchema>

export const CultFitInvoicePage = () => {
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<CultFitFormValues>({
    resolver: zodResolver(cultFitFormSchema) as Resolver<CultFitFormValues>,
    mode: 'onBlur',
    defaultValues: {
      total: 0,
      status: 'VoucherGeneratedPaymentPending',
    }
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSaving(true)
    try {
      const emptyInvoice = await createEmptyInvoice()
      
      const savedInvoice = await saveInvoiceDraft(emptyInvoice, {
        invoiceType: 'DigitalService',
        status: values.status,
        customer: {
          name: values.customerName,
          phone: values.customerPhone,
        },
        flight: emptyInvoice.flight, // Keep default empty flight details
        digitalService: {
          itemName: 'Cult Fit Elite 1M',
        },
        pricing: {
          totalFare: values.total,
          discountPercentage: 0,
          advancePayment: 0,
        },
      })

      navigate(`/invoices/${savedInvoice.id}/preview`)
    } finally {
      setIsSaving(false)
    }
  })

  return (
    <>
      <PageHeader
        title="New Cult Fit Invoice (1M)"
        actions={
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSaving}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 disabled:opacity-70"
          >
            {isSaving ? 'Creating...' : 'Create & Preview'}
          </button>
        }
      />
      <form className="animate-slide-up grid gap-4 pb-24 sm:gap-5 xl:grid-cols-[1fr_320px] xl:pb-0" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-5">
          <Panel title="Customer details">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField 
                label="Customer name" 
                error={form.formState.errors.customerName?.message} 
                {...form.register('customerName')} 
              />
              <TextField 
                label="Phone number" 
                error={form.formState.errors.customerPhone?.message} 
                {...form.register('customerPhone')} 
              />
            </div>
          </Panel>

          <Panel title="Cult Fit Details">
             <div className="grid gap-4 md:grid-cols-2">
               <div className="md:col-span-2">
                 <p className="text-sm font-semibold text-slate-600">Service: <span className="font-bold text-slate-900">Cult Fit Elite 1M</span></p>
                 <p className="text-xs text-slate-500 mt-1">This will automatically generate a Digital Service invoice.</p>
               </div>
               <TextField 
                label="Total Price" 
                type="number"
                min={0}
                error={form.formState.errors.total?.message} 
                {...form.register('total', { valueAsNumber: true })} 
              />
              <SelectField
                label="Payment Status"
                {...form.register('status')}
              >
                <option value="VoucherGeneratedPaymentPending">Voucher Generated and Payment Pending</option>
                <option value="PaymentDone">Payment Done</option>
              </SelectField>
             </div>
          </Panel>
        </div>
      </form>
    </>
  )
}
