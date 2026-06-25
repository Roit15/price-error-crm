import type React from 'react'
import type { ReactNode } from 'react'
import { forwardRef } from 'react'

export const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="glass-card hover-lift rounded-xl p-4 sm:p-5 transition-all duration-300">
    <h3 className="mb-4 text-lg font-black tracking-tight text-slate-950">{title}</h3>
    {children}
  </section>
)

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, ...props }, ref) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-600">{label}</span>
      <input
        ref={ref}
        className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
        {...props}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  ),
)
TextField.displayName = 'TextField'

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, children, ...props }, ref) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-600">{label}</span>
      <select
        ref={ref}
        className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
        {...props}
      >
        {children}
      </select>
    </label>
  ),
)
SelectField.displayName = 'SelectField'
