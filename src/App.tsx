import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './app/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { InvoiceFormPage } from './pages/InvoiceFormPage'
import { InvoiceListPage } from './pages/InvoiceListPage'
import { InvoicePreviewPage } from './pages/InvoicePreviewPage'
import { SettingsPage } from './pages/SettingsPage'

export const App = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route index element={<DashboardPage />} />
      <Route path="invoices" element={<InvoiceListPage />} />
      <Route path="invoices/new" element={<InvoiceFormPage />} />
      <Route path="invoices/:invoiceId/edit" element={<InvoiceFormPage />} />
      <Route path="invoices/:invoiceId/preview" element={<InvoicePreviewPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
)

export default App
