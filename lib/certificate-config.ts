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
}

export interface CertificateConfig {
  candidateName: CertificateField
  jobRole: CertificateField
  dateOfIssuance: CertificateField
  certificateNumber: CertificateField
  enrollmentNumber: CertificateField
  aadhaar: CertificateField
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
    x: 175,
    y: 261,
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 450,
  },
  aadhaar: {
    x: 600,
    y: 261,
    fontSize: 12,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 200,
  },
  jobRole: {
    x: 120,
    y: 322,
    fontSize: 16,
    fontFamily: 'HelveticaBold',
    color: [0, 0, 0],
    maxWidth: 600,
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

// Helper function to center text horizontally
export function centerText(text: string, fontSize: number, fontFamily: string, pageWidth: number = 595): number {
  // Approximate character width (this is a rough estimate)
  const charWidth = fontSize * 0.6
  const textWidth = text.length * charWidth
  return (pageWidth - textWidth) / 2
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
