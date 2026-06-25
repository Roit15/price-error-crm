import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Pencil, Printer, MessageCircle, Download, CheckCircle } from 'lucide-react'
import { InvoicePrint } from '../components/InvoicePrint'
import { PageHeader } from '../components/PageHeader'
import type { Invoice } from '../domain/invoice'
import { buildWhatsAppInvoiceUrl } from '../domain/whatsapp'
import { invoiceRepository } from '../persistence/invoiceRepository'
import { createInvoicePdfBlob, downloadBlob } from '../services/pdfExport'
import { useSettingsStore } from '../store/settingsStore'

export const InvoicePreviewPage = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const settings = useSettingsStore((state) => state.settings)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [shareState, setShareState] = useState<'idle' | 'preparing' | 'done'>('idle')

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) {
        navigate('/invoices', { replace: true })
        return
      }
      const loadedInvoice = await invoiceRepository.get(invoiceId)
      if (!loadedInvoice) {
        navigate('/invoices', { replace: true })
        return
      }
      setInvoice(loadedInvoice)
    }

    void loadInvoice()
  }, [invoiceId, navigate])

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-[600px] w-full max-w-[210mm] rounded-xl" />
      </div>
    )
  }

  const sharePdfOnWhatsApp = async () => {
    setShareState('preparing')
    const filename = `${invoice.invoiceNumber}.pdf`
    const pdfBlob = await createInvoicePdfBlob(invoice, settings)
    downloadBlob(pdfBlob, filename)
    window.open(buildWhatsAppInvoiceUrl(invoice, settings), '_blank', 'noreferrer')
    setShareState('done')
    setTimeout(() => setShareState('idle'), 4000)
  }

  return (
    <>
      <PageHeader
        eyebrow={invoice.invoiceNumber}
        title="Invoice preview"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/invoices/${invoice.id}/edit`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow"
            >
              <Pencil size={14} />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2 text-sm font-bold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <a
              href={buildWhatsAppInvoiceUrl(invoice, settings)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow"
            >
              <MessageCircle size={14} />
              Text
            </a>
            <button
              type="button"
              onClick={() => void sharePdfOnWhatsApp()}
              disabled={shareState === 'preparing'}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#128c7e] to-[#075e54] px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait"
            >
              {shareState === 'preparing' ? (
                <>
                  <Download size={14} className="animate-bounce" />
                  Preparing...
                </>
              ) : shareState === 'done' ? (
                <>
                  <CheckCircle size={14} />
                  Sent!
                </>
              ) : (
                <>
                  <MessageCircle size={14} />
                  WhatsApp PDF
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Toast notification */}
      {shareState === 'done' && (
        <div className="animate-slide-up mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle size={16} />
          PDF downloaded. Customer WhatsApp opened.
        </div>
      )}

      <div className="animate-scale-in print-preview-shell">
        <InvoicePrint invoice={invoice} settings={settings} />
      </div>
    </>
  )
}
