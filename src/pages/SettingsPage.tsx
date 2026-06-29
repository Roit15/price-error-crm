import { useRef, useState } from 'react'
import { Download, Upload, Check } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { TextField } from '../components/ui/FormControls'
import type { AppSettings } from '../domain/invoice'
import { exportInvoices, importInvoices } from '../services/invoiceService'
import { useSettingsStore } from '../store/settingsStore'

export const SettingsPage = () => {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const [draft, setDraft] = useState(settings)
  const [message, setMessage] = useState('')
  const [saveFlash, setSaveFlash] = useState(false)

  const updateField = (field: keyof AppSettings, value: string) => {
    const nextSettings = { ...draft, [field]: value }
    setDraft(nextSettings)
    updateSettings(nextSettings)
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1500)
  }

  const downloadBackup = async () => {
    try {
      const backup = await exportInvoices()
      const blob = new Blob([backup], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `price-error-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setMessage('Backup exported successfully.')
    } catch {
      setMessage('Export failed — could not reach the central database. Your saved data is safe; please retry once the connection is restored.')
    }
  }

  const importBackup = async (file?: File) => {
    if (!file) return

    try {
      const count = await importInvoices(await file.text())
      setMessage(`Imported ${count} invoice${count === 1 ? '' : 's'} successfully.`)
    } catch {
      setMessage('Import failed. Please choose a valid Price Error backup JSON file.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <PageHeader eyebrow="Local app" title="Settings & backup" />

      {/* Save confirmation */}
      {saveFlash && (
        <div className="animate-slide-up mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <Check size={15} />
          Settings saved
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px] animate-slide-up" style={{ animationDelay: '60ms' }}>
        <section className="glass-card rounded-xl p-5">
          <h3 className="mb-1 text-lg font-black tracking-tight text-slate-950">Invoice brand details</h3>
          <p className="mb-5 text-sm text-slate-500">These details appear on your printed invoices and PDFs.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Brand name" value={draft.brandName} onChange={(event) => updateField('brandName', event.target.value)} />
            <TextField label="Tagline" value={draft.tagline} onChange={(event) => updateField('tagline', event.target.value)} />
            <TextField label="Logo URL" value={draft.logoUrl} onChange={(event) => updateField('logoUrl', event.target.value)} />
            <TextField label="Phone" value={draft.phone} onChange={(event) => updateField('phone', event.target.value)} />
            <TextField label="Website / social handle" value={draft.website} onChange={(event) => updateField('website', event.target.value)} />
            <div className="md:col-span-2">
              <hr className="my-2 border-slate-100" />
            </div>
            <TextField label="UPI ID" value={draft.upiId} onChange={(event) => updateField('upiId', event.target.value)} />
            <TextField label="UPI payee name" value={draft.upiPayeeName} onChange={(event) => updateField('upiPayeeName', event.target.value)} />
          </div>
        </section>

        <section className="h-fit rounded-xl glass-card-dark p-5 text-white">
          <h3 className="text-lg font-black">Backup</h3>
          <p className="mt-1 text-sm text-slate-400">Export or restore your invoice database.</p>
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => void downloadBackup()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/30"
            >
              <Download size={15} />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-white/12"
            >
              <Upload size={15} />
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => void importBackup(event.target.files?.[0])}
            />
            {message ? (
              <p className="animate-fade-in rounded-lg bg-white/8 px-3 py-2 text-sm font-medium text-slate-300">{message}</p>
            ) : null}
          </div>
        </section>
      </div>
    </>
  )
}
