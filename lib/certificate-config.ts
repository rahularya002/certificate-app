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
  nameOfFatherHusband: CertificateField
  aadhaar: CertificateField
  trainingCenter: CertificateField
  assessmentPartner: CertificateField
  district: CertificateField
  state: CertificateField
  salutation: CertificateField
  guardianType: CertificateField
}

// Configuration based on ICES certificate layout
export const defaultCertificateConfig: CertificateConfig = {
  salutation: {
    x: 100, // Center horizontally (595/2)
    y: 260, // Top area for salutation (Mr/Ms)
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 100,
  },
  candidateName: {
    x: 130, // Center horizontally (595/2)
    y: 260, // Below "This is to certify that" - main name area
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Red color like in the example
    maxWidth: 450,
  },
  guardianType: {
    x: 300, // Left side for guardian type
    y: 260, // Below candidate name
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 150,
  },
  nameOfFatherHusband: {
    x: 340, // Center horizontally
    y: 260, // Below candidate name, next to "S/o"
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 450,
  },
  aadhaar: {
    x: 620, // Right side, next to "having Adhaar"
    y: 260, // Upper middle section
    fontSize: 12,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 200,
  },
  jobRole: {
    x: 100, // Center horizontally
    y: 315, // Middle section, next to "job role"
    fontSize: 16,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Red color
    maxWidth: 600,
  },
  trainingCenter: {
    x: 280, // Center horizontally
    y: 343, // Lower middle section, next to "Training Centre"
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 450,
  },
  district: {
    x: 511, // Center horizontally
    y: 343, // Below training center
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 450,
  },
  state: {
    x: 620, // Center horizontally
    y: 342, // Below district
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 450,
  },
  assessmentPartner: {
    x: 465, // Center horizontally
    y: 381, // Below state
    fontSize: 14,
    fontFamily: 'HelveticaBold',
    color: [0.8, 0, 0], // Black
    maxWidth: 450,
  },
  enrollmentNumber: {
    x: 122, // Left side, bottom area
    y: 441, // Above certificate number
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: [0.8, 0, 0], // Black
  },
  certificateNumber: {
    x: 122, // Left side, bottom area
    y: 454, // Above date of issue
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: [0.8, 0, 0], // Black
  },
  dateOfIssuance: {
    x: 220, // Left side, bottom area
    y: 508, // Bottom left, next to "Date of Issue"
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: [0.8, 0, 0], // Black
    maxWidth: 300,
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
