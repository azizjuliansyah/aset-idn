import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { ItemWithJoins } from '@/hooks/items/use-items-manager'

/**
 * Generates a PDF containing QR codes for the provided items.
 * Each item gets its own QR code on the provided template background.
 */
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

export async function generateItemQRCodePDF(items: ItemWithJoins[]) {
  if (!items || items.length === 0) return

  // Create a new PDF document in A4 Portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
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

  const templatePath = '/images/default/bg-qrcode-item-template.png'
  
  // Pre-load the template image
  const img = new Image()
  img.src = templatePath
  
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  // Settings for the grid
  const margin = 10
  const stickerWidth = 90
  const stickerHeight = 36
  const gapX = 10
  const gapY = 5
  const stickersPerPage = 14 // 2 columns x 7 rows
  const cols = 2

  // Function to add a single sticker to the PDF
  const addSticker = async (item: ItemWithJoins, index: number) => {
    const pageIndex = Math.floor(index / stickersPerPage)
    const itemIndexInPage = index % stickersPerPage
    
    if (index > 0 && itemIndexInPage === 0) {
      pdf.addPage()
    }

    const col = itemIndexInPage % cols
    const row = Math.floor(itemIndexInPage / cols)

    const x = margin + (col * (stickerWidth + gapX))
    const y = margin + (row * (stickerHeight + gapY))

    // 1. Add background template with JPEG compression
    pdf.addImage(img, 'JPEG', x, y, stickerWidth, stickerHeight, undefined, 'FAST')

    // 2. Generate and add QR code
    try {
      const qrDataUrl = await QRCode.toDataURL(item.id, {
        margin: 1,
        width: 200,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      const qrSize = stickerHeight * 0.75
      const qrX = x + (stickerWidth * 0.06)
      const qrY = y + (stickerHeight - qrSize) / 2
      pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
    } catch (err) {
      console.error('Error generating QR code:', err)
    }

    // 3. Add item name
    const fontList = pdf.getFontList()
    const isMontserratAvailable = fontList['Montserrat'] !== undefined
    
    pdf.setFont(isMontserratAvailable ? 'Montserrat' : 'helvetica', 'bold')
    pdf.setFontSize(15) // Slightly increased for more impact
    pdf.setTextColor(125, 32, 31) // Maroon (#7D201F)
    
    const rightBoxCenterX = x + (stickerWidth * 0.68)
    const rightBoxCenterY = y + (stickerHeight * 0.55)
    
    const splitName = pdf.splitTextToSize(item.name, stickerWidth * 0.5)
    
    const lineHeight = 6 
    const totalHeight = splitName.length * lineHeight
    const centeredY = rightBoxCenterY - (totalHeight / 2) + 3
    
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
