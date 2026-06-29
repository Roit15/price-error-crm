import { AlertTriangle, RefreshCw } from 'lucide-react'

type CentralDbBannerProps = {
  message: string
  onRetry?: () => void
}

export const CentralDbBanner = ({ message, onRetry }: CentralDbBannerProps) => (
  <div className="animate-slide-up mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-2">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
      <p className="font-medium">{message}</p>
    </div>
    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm transition-colors hover:bg-red-100"
      >
        <RefreshCw size={13} />
        Retry
      </button>
    ) : null}
  </div>
)
