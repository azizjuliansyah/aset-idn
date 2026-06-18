import { jsPDF } from 'jspdf'
import type { ItemWithJoins } from '@/hooks/items/use-items-manager'

// Dynamic import for QRCode to avoid SSR issues
async function getQRCode() {
  if (typeof window === 'undefined') {
    throw new Error('QRCode generation is only available in browser context')
  }
  // Dynamic import to ensure proper browser bundling
  const qrcodeModule = await import('qrcode')
  // The library exports named exports, use default fallback
  const QRCode = qrcodeModule.default || qrcodeModule
  // Return the toDataURL function directly
  return QRCode.toDataURL?.bind(QRCode) || QRCode.toDataURL
}

/**
 * Convert a Blob to a Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Generates a PDF containing QR codes for the provided items.
 * Each item gets its own QR code on the provided template background.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  // Use Buffer for Node.js environment, fallback to btoa for browser
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(binary)
  }
  // Node.js environment
  return Buffer.from(binary).toString('base64')
}

export async function generateItemQRCodePDF(items: ItemWithJoins[]) {
  if (!items || items.length === 0) return

  // Ensure we're in browser context
  if (typeof window === 'undefined') {
    console.error('QR Code PDF generation must be run in browser context')
    return
  }

  // Create a new PDF document in A6 Portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6',
  })

  // 1. Load Montserrat Black Font (The boldest weight)
  try {
    const fontRes = await fetch('/fonts/Montserrat-Black.ttf')
    if (fontRes.ok) {
      const fontData = await fontRes.arrayBuffer()
      const fontBase64 = arrayBufferToBase64(fontData)
      pdf.addFileToVFS('Montserrat-Black.ttf', fontBase64)
      pdf.addFont('Montserrat-Black.ttf', 'Montserrat', 'bold')
      console.log('Montserrat-Black font loaded successfully')
    } else {
      // Fallback to ExtraBold if Black fails
      const ebRes = await fetch('/fonts/Montserrat-ExtraBold.ttf')
      if (ebRes.ok) {
        const fontData = await ebRes.arrayBuffer()
        const fontBase64 = arrayBufferToBase64(fontData)
        pdf.addFileToVFS('Montserrat-ExtraBold.ttf', fontBase64)
        pdf.addFont('Montserrat-ExtraBold.ttf', 'Montserrat', 'bold')
      }
    }
  } catch (err) {
    console.error('Error loading font:', err)
  }

  // Load the template image and convert to data URL
  let templateDataUrl: string | null = null
  try {
    const templateRes = await fetch('/images/default/bg-qrcode-item-template.png')
    if (templateRes.ok) {
      const templateBlob = await templateRes.blob()
      templateDataUrl = await blobToDataUrl(templateBlob)
    }
  } catch (err) {
    console.error('Error loading template image:', err)
  }

  // Settings for the grid (A6: 105mm x 148mm, 1 column x 5 rows)
  const pageWidth = 105
  const pageHeight = 148
  const stickerWidth = 60
  const stickerHeight = 24
  const gapY = 4
  const stickersPerPage = 5 // 1 column x 5 rows
  const cols = 1

  // Calculate vertical centering
  const totalContentHeight = (stickersPerPage * stickerHeight) + ((stickersPerPage - 1) * gapY)
  const startY = (pageHeight - totalContentHeight) / 2

  // Function to add a single sticker to the PDF
  const addSticker = async (item: ItemWithJoins, index: number) => {
    const pageIndex = Math.floor(index / stickersPerPage)
    const itemIndexInPage = index % stickersPerPage

    if (index > 0 && itemIndexInPage === 0) {
      pdf.addPage()
    }

    const row = itemIndexInPage // Single column, row = index

    // Horizontal centering
    const x = (pageWidth - stickerWidth) / 2
    // Vertical position with start offset for centering
    const y = startY + (row * (stickerHeight + gapY))

    // 1. Add background template with JPEG compression
    if (templateDataUrl) {
      pdf.addImage(templateDataUrl, 'PNG', x, y, stickerWidth, stickerHeight, undefined, 'FAST')
    }

    // 2. Generate and add QR code
    try {
      // Validate item ID - accept both string and number
      if (!item.id) {
        throw new Error(`Invalid item ID: ${item.id}`)
      }

      // Convert ID to string for QR code generation
      const qrId = String(item.id)

      const toDataURL = await getQRCode()
      const qrDataUrl = await toDataURL(qrId, {
        margin: 1,
        width: 200,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      const qrSize = stickerHeight * 0.7
      const qrX = x + (stickerWidth * 0.05)
      const qrY = y + (stickerHeight - qrSize) / 2
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    } catch (err) {
      console.error('Error generating QR code:', err)
      console.error('Item data:', { id: item.id, name: item.name })
    }

    // 3. Add item name
    const fontList = pdf.getFontList()
    const isMontserratAvailable = fontList['Montserrat'] !== undefined

    pdf.setFont(isMontserratAvailable ? 'Montserrat' : 'helvetica', 'bold')
    pdf.setFontSize(12) // Larger font for bigger stickers
    pdf.setTextColor(125, 32, 31) // Maroon (#7D201F)

    const rightBoxCenterX = x + (stickerWidth * 0.68)
    const rightBoxCenterY = y + (stickerHeight * 0.55)

    const splitName = pdf.splitTextToSize(item.name, stickerWidth * 0.5)

    const lineHeight = 5
    const totalHeight = splitName.length * lineHeight
    const centeredY = rightBoxCenterY - (totalHeight / 2) + 2

    pdf.text(splitName, rightBoxCenterX, centeredY, { align: 'center' })
  }

  // Process all items
  for (let i = 0; i < items.length; i++) {
    await addSticker(items[i], i)
  }

  // Save the PDF
  const filename = items.length === 1 
    ? `QR_${items[0].name.replace(/\s+/g, '_')}.pdf`
    : `QR_Items_Bulk_${new Date().getTime()}.pdf`
  
  pdf.save(filename)
}
