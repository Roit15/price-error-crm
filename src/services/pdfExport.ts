import { invoiceStatusLabels, type AppSettings, type Invoice } from '../domain/invoice'
import { getInvoiceHighlights, getInvoiceTerms, getInvoiceTitle, getTotalLabel } from '../domain/invoiceContent'

export const createInvoicePdfBlob = async (invoice: Invoice, settings: AppSettings) => {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const left = 14
  const right = pageWidth - 14
  const bottom = pageHeight - 14
  let y = 14

  const addPageIfNeeded = (requiredHeight: number) => {
    if (y + requiredHeight <= bottom) return
    pdf.addPage()
    y = 16
  }

  const addText = (text: string, x: number, size = 10, style: 'normal' | 'bold' = 'normal', maxWidth?: number) => {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    const lines = maxWidth ? (pdf.splitTextToSize(text, maxWidth) as string[]) : [text]
    addPageIfNeeded(lines.length * (size * 0.42 + 1.8))
    pdf.text(lines, x, y)
    y += lines.length * (size * 0.42 + 1.8)
  }

  const addRule = () => {
    addPageIfNeeded(7)
    pdf.setDrawColor(30, 41, 59)
    pdf.line(left, y, right, y)
    y += 7
  }

  const drawBox = (x: number, top: number, width: number, height: number, fill?: [number, number, number]) => {
    pdf.setDrawColor(226, 232, 240)
    if (fill) {
      pdf.setFillColor(...fill)
      pdf.rect(x, top, width, height, 'FD')
      return
    }
    pdf.rect(x, top, width, height, 'S')
  }

  const addRow = (label: string, value: string, bold = false) => {
    const rowHeight = 9
    addPageIfNeeded(rowHeight)
    drawBox(left, y, right - left, rowHeight, bold ? [15, 23, 42] : undefined)
    pdf.setTextColor(bold ? 255 : 15, bold ? 255 : 23, bold ? 255 : 42)
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(bold ? 11 : 10)
    pdf.text(label, left + 3, y + 6)
    pdf.text(value, right - 3, y + 6, { align: 'right' })
    pdf.setTextColor(15, 23, 42)
    y += rowHeight
  }

  const addPassengerSummary = (passengerNames: string) => {
    const passengers = formatPassengerSummary(passengerNames)
    if (passengers.length === 0) return

    addPageIfNeeded(5 + passengers.length * 4)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text('Passengers', left, y)
    y += 5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    passengers.forEach((passenger, index) => {
      const wrapped = pdf.splitTextToSize(`${index + 1}. ${passenger}`, right - left) as string[]
      addPageIfNeeded(wrapped.length * 4)
      pdf.text(wrapped, left, y)
      y += wrapped.length * 4
    })
  }

  pdf.setTextColor(15, 23, 42)
  const logoDataUrl = await getImageDataUrl(settings.logoUrl)
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', left, 11, 88, 27.6)
    y = 43
  } else {
    addText(settings.brandName, left, 22, 'bold')
    addText(settings.tagline, left, 10)
  }
  addText(`Call/WhatsApp: ${settings.phone}`, left, 8)
  addText(settings.website, left, 8)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(6, 95, 70)
  pdf.text(getInvoiceTitle(invoice).toUpperCase(), right, 18, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(15, 23, 42)
  pdf.text(invoice.invoiceNumber, right, 25, { align: 'right' })
  pdf.text(formatDate(invoice.invoiceDate), right, 31, { align: 'right' })
  pdf.setFillColor(15, 23, 42)
  pdf.roundedRect(right - 33, 35, 33, 8, 2, 2, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(255, 255, 255)
  pdf.text(invoiceStatusLabels[invoice.status].toUpperCase(), right - 16.5, 40.3, { align: 'center' })
  pdf.setTextColor(15, 23, 42)
  y = Math.max(y, 57)
  addRule()

  const highlightWidth = (right - left - 4) / 3
  getInvoiceHighlights(invoice).forEach((highlight, index) => {
    const x = left + index * (highlightWidth + 2)
    drawBox(x, y, highlightWidth, 11, [236, 253, 245])
    pdf.setTextColor(6, 95, 70)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.text(pdf.splitTextToSize(highlight, highlightWidth - 5) as string[], x + highlightWidth / 2, y + 4.5, { align: 'center' })
  })
  pdf.setTextColor(15, 23, 42)
  y += 18

  const blockTop = y
  drawBox(left, blockTop, 86, 30)
  drawBox(111, blockTop, 85, 30, [248, 250, 252])
  y = blockTop + 7
  addText('BILL TO', left + 4, 8, 'bold')
  addText(invoice.customer.name || 'Customer name', left + 4, 12, 'bold', 76)
  addText(invoice.customer.phone, left + 4, 9)
  y = blockTop + 7
  addText('PRICE ERROR DETAILS', 115, 8, 'bold', 72)
  addText('Quotation validity: 24 hours', 115, 9, 'bold', 72)
  addText('Payment after booking confirmation only', 115, 8, 'normal', 72)
  addText(`Support: ${settings.phone}`, 115, 8, 'normal', 72)
  y = blockTop + 38

  if (invoice.invoiceType === 'DigitalService') {
    addPageIfNeeded(34)
    addText('DIGITAL SERVICE', left, 10, 'bold')
    addRow('Item Name', invoice.digitalService?.itemName || 'Digital service')
    y += 3
    addText('PRICE SUMMARY', left, 10, 'bold')
    addRow('Total Price', formatPdfInr(invoice.pricing.totalFare))
  } else {
    addPageIfNeeded(46)
    addText('FLIGHT ITINERARY', left, 10, 'bold')
    const colWidth = (right - left) / 4
    const headers = ['From', 'To', 'Departure', 'Return']
    const values = [
      invoice.flight.origin,
      invoice.flight.destination,
      formatDate(invoice.flight.departureDate),
      invoice.flight.returnDate ? formatDate(invoice.flight.returnDate) : 'N/A',
    ]
    headers.forEach((header, index) => {
      drawBox(left + colWidth * index, y, colWidth, 8, [241, 245, 249])
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text(header, left + colWidth * index + 3, y + 5)
    })
    y += 8
    values.forEach((value, index) => {
      drawBox(left + colWidth * index, y, colWidth, 12)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(pdf.splitTextToSize(value, colWidth - 6) as string[], left + colWidth * index + 3, y + 5)
    })
    y += 17
    addText(`${invoice.flight.airline || 'Airline TBC'} | ${invoice.flight.travelClass} | ${invoice.flight.passengerCount} passenger(s)`, left, 10)
    if (invoice.flight.passengerNames) addPassengerSummary(invoice.flight.passengerNames)
    y += 3

    addPageIfNeeded(42)
    addText('FARE SUMMARY', left, 10, 'bold')
    addRow('Total Fare', formatPdfInr(invoice.pricing.totalFare))
    addRow(`Discount (${invoice.pricing.discountPercentage}%)`, `- ${formatPdfInr(invoice.pricing.discountAmount)}`)
    addRow('Total Passengers', `${invoice.flight.passengerCount}`)
  }
  addRow(getTotalLabel(invoice).toUpperCase(), formatPdfInr(invoice.pricing.total), true)
  if (invoice.invoiceType === 'FlightTicket' && invoice.pricing.advancePayment > 0) {
    addRow('Advance Payment Received', formatPdfInr(invoice.pricing.advancePayment))
    addRow('BALANCE PENDING', formatPdfInr(Math.max(0, invoice.pricing.total - invoice.pricing.advancePayment)), true)
  }
  y += 3

  const terms = getInvoiceTerms(invoice)
  const termLines = terms.map((term) => pdf.splitTextToSize(`- ${term}`, right - left - 8) as string[])
  const termsHeight = Math.max(34, 14 + termLines.reduce((height, lines) => height + lines.length * 5 + 2, 0))
  addPageIfNeeded(termsHeight)
  const termsTop = y
  drawBox(left, termsTop, right - left, termsHeight, [255, 251, 235])
  y += 8
  addText('TERMS & CONDITIONS - PLEASE READ BEFORE PAYMENT', left + 4, 10, 'bold')
  termLines.forEach((wrapped) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(wrapped, left + 4, y)
    y += wrapped.length * 5 + 2
  })

  y = Math.max(y + 8, termsTop + termsHeight + 8)
  addPageIfNeeded(28)
  addRule()
  addText('Authorized by Price Error', left, 10, 'bold')
  addText('No backend payment gateway or auto-cancellation is implied by this document.', left, 7, 'normal', 88)
  pdf.setFontSize(8)
  pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, right, y - 6, { align: 'right' })
  pdf.text('This is a computer-generated document.', right, y, { align: 'right' })

  return pdf.output('blob')
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const formatDate = (date: string) => {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-IN').format(new Date(`${date}T00:00:00`))
}

const formatPdfInr = (amount: number) => `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`

const formatPassengerSummary = (passengerNames: string) =>
  passengerNames
    .split(/\n\s*\n/)
    .map((block) => {
      const details = Object.fromEntries(
        block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [key, ...value] = line.split('-')
            return [key.trim().toLowerCase(), value.join('-').trim()]
          }),
      )
      const name = [details['given name'], details.surname].filter(Boolean).join(' ')
      const dob = details.dob ? `, DOB ${details.dob}` : ''
      return name ? `${name}${dob}` : block.replace(/\s+/g, ' ').trim()
    })
    .filter(Boolean)

const MAX_LOGO_BYTES = 2 * 1024 * 1024

const isAllowedImageUrl = (url: string) => {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'data:'
  } catch {
    return false
  }
}

const getImageDataUrl = async (url: string) => {
  if (!url || !isAllowedImageUrl(url)) return ''

  try {
    const response = await fetch(url)
    if (!response.ok) return ''
    const blob = await response.blob()
    if (!blob.type.startsWith('image/') || blob.size > MAX_LOGO_BYTES) return ''

    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}
