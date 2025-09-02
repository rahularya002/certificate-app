// Certificate text positioning configuration
// Coordinates are in points (1/72 inch) from bottom-left corner
// You can adjust these values based on your specific template

export interface CertificateField {
  x: number
  y: number
  fontSize: number
  fontFamily: 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'TimesRomanBold'
  color: [number, number, number] // RGB values 0-1
  maxWidth?: number // Optional max width for text wrapping
  align?: 'left' | 'center' | 'right' // Text alignment (default: left)
}

export interface CertificateConfig {
  candidateName: CertificateField
  jobRole: CertificateField
  dateOfIssuance: CertificateField
  certificateNumber: CertificateField
  enrollmentNumber: CertificateField
  trainingCenter: CertificateField
  assessmentPartner: CertificateField
  district: CertificateField
  state: CertificateField
  // Position and size (in points) for QR image placement
  qrCode: {
    x: number
    y: number
    size: number
  }
}

// Configuration based on ICES certificate layout
export const defaultCertificateConfig: CertificateConfig = {
  candidateName: {
    x: 0, // Not used when align='center' - will be calculated dynamically
    y: 261,
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 800, // Wider to accommodate full name + aadhaar
    align: 'center', // Center-aligned for the complete line
  },
  jobRole: {
    x: 0, // Not used when align='center' - will be calculated dynamically
    y: 322,
    fontSize: 16,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 600,
    align: 'center',
  },
  trainingCenter: {
    x: 230,
    y: 352,
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 450,
  },
  district: {
    x: 463,
    y: 352,
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 450,
  },
  state: {
    x: 565,
    y: 352,
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 450,
  },
  assessmentPartner: {
    x: 330,
    y: 390,
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 450,
  },
  enrollmentNumber: {
    x: 123,
    y: 449,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: [0, 0, 0],
  },
  certificateNumber: {
    x: 122,
    y: 462,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: [0, 0, 0],
  },
  dateOfIssuance: {
    x: 220,
    y: 517,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: [0, 0, 0],
    maxWidth: 300,
  },
  // Default QR code placement (adjust to match your template)
  qrCode: {
    x: 70,
    y: 480,
    size: 90,
  },
}

// Helper function to calculate text width
export function getTextWidth(text: string, fontSize: number, fontFamily: string): number {
  // Approximate character width based on font and size
  let avgCharWidth: number
  
  switch (fontFamily) {
    case 'HelveticaBold':
    case 'TimesRomanBold':
      avgCharWidth = fontSize * 0.65 // Bold fonts are wider
      break
    case 'TimesRoman':
      avgCharWidth = fontSize * 0.58 // Times is slightly narrower
      break
    default: // Helvetica
      avgCharWidth = fontSize * 0.6
      break
  }
  
  return text.length * avgCharWidth
}

// Helper function to calculate aligned x position
export function getAlignedX(
  text: string, 
  baseX: number, 
  fontSize: number, 
  fontFamily: string, 
  align: 'left' | 'center' | 'right' = 'left',
  maxWidth?: number
): number {
  if (align === 'left') {
    return baseX
  }
  
  const textWidth = getTextWidth(text, fontSize, fontFamily)
  const effectiveWidth = maxWidth || textWidth
  
  switch (align) {
    case 'center':
      return baseX - (textWidth / 2)
    case 'right':
      return baseX - textWidth
    default:
      return baseX
  }
}

// Helper function to get font from pdf-lib
export function getFontFamily(fontFamily: string): 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'TimesRomanBold' {
  switch (fontFamily) {
    case 'HelveticaBold':
      return 'HelveticaBold'
    case 'TimesRoman':
      return 'TimesRoman'
    case 'TimesRomanBold':
      return 'TimesRomanBold'
    default:
      return 'Helvetica'
  }
}
