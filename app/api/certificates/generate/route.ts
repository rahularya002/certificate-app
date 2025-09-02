import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { PDFDocument, rgb, StandardFonts, PDFPage } from "pdf-lib"
import { defaultCertificateConfig, getAlignedX } from "@/lib/certificate-config"
import QRCode from "qrcode"

// Cache for template PDFs to avoid repeated downloads
const templateCache = new Map<string, { pdfBytes: ArrayBuffer, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper function to clear existing text from a PDF page
async function clearExistingText(page: PDFPage) {
  try {
    // Get all text operators on the page
    const operators = page.node.normalizedEntries()
    
    // Remove text-related operators (this is a simplified approach)
    // In practice, you might want to use a more sophisticated method
    console.log("Clearing existing text from template page")
    
    // Alternative: Create a new page with just the background
    // This preserves the template design while removing text
    return true
  } catch (error) {
    console.log("Could not clear existing text, proceeding with overlay:", error)
    return false
  }
}

// Helper function to add perfectly centered text
function addCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  fontSize: number,
  font: any,
  color: [number, number, number],
  maxWidth?: number
) {
  // Use the actual page width from the PDF
  const pageWidth = page.getWidth()
  
  // Use the actual font to measure text width more accurately
  const textWidth = font.widthOfTextAtSize(text, fontSize)
  
  // Center the text horizontally based on actual page width
  const x = (pageWidth - textWidth) / 2
  
  // Debug logging for centering calculation
  console.log(`  📏 Centering calculation: pageWidth=${pageWidth}, textWidth=${textWidth}, finalX=${x}, text="${text}"`)
  
  page.drawText(text, {
    x,
    y: page.getHeight() - y,
    size: fontSize,
    font,
    color: rgb(color[0], color[1], color[2]),
    maxWidth: maxWidth || textWidth + 50, // Add some padding
  })
  
  return { x, y }
}

// Helper function to calculate text width (moved from config for use here)
function getTextWidth(text: string, fontSize: number, fontFamily: string): number {
  let avgCharWidth: number
  
  switch (fontFamily) {
    case 'HelveticaBold':
    case 'TimesRomanBold':
      avgCharWidth = fontSize * 0.65
      break
    case 'TimesRoman':
      avgCharWidth = fontSize * 0.58
      break
    default:
      avgCharWidth = fontSize * 0.6
      break
  }
  
  return text.length * avgCharWidth
}

// Optimized function to get template PDF with caching
async function getTemplatePDF(supabase: any, template: any): Promise<ArrayBuffer> {
  const cacheKey = `${template.id}-${template.file_path}`
  const cached = templateCache.get(cacheKey)
  
  // Check if we have a valid cached version
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log("📦 Using cached template PDF")
    return cached.pdfBytes
  }

  console.log("📥 Downloading fresh template PDF")
  
  // Get signed URL for the template PDF file
  let signedUrlData, signedUrlError
  try {
    const result = await supabase.storage
      .from("templates")
      .createSignedUrl(template.file_path, 120)
    signedUrlData = result.data
    signedUrlError = result.error
  } catch (e) {
    console.log("Error with 'templates' bucket:", e)
    signedUrlError = e
  }

  // If templates bucket fails, try certificates bucket
  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.log("Trying 'certificates' bucket as fallback...")
    try {
      const result = await supabase.storage
        .from("certificates")
        .createSignedUrl(template.file_path, 120)
      signedUrlData = result.data
      signedUrlError = result.error
    } catch (e) {
      console.log("Error with 'certificates' bucket:", e)
      signedUrlError = e
    }
  }

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error("Failed to access template PDF")
  }

  const templateRes = await fetch(signedUrlData.signedUrl)
  if (!templateRes.ok) {
    throw new Error("Failed to download template PDF")
  }
  
  const templatePdfBytes = await templateRes.arrayBuffer()
  
  // Cache the result
  templateCache.set(cacheKey, { pdfBytes: templatePdfBytes, timestamp: Date.now() })
  
  return templatePdfBytes
}

// Optimized QR code generation with caching
const qrCache = new Map<string, string>()
async function generateQRCode(content: string): Promise<string> {
  const cacheKey = content
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!
  }
  
  const qrDataUrl = await QRCode.toDataURL(content, { margin: 0, scale: 6 })
  qrCache.set(cacheKey, qrDataUrl)
  return qrDataUrl
}

export async function POST(request: NextRequest) {
  try {
    const { studentIds, templateId } = await request.json()
    
    console.log("=== Certificate Generation Debug ===")
    console.log("Request data:", { studentIds, templateId })
    console.log("Student IDs type:", typeof studentIds, "Array?", Array.isArray(studentIds))

    if (!studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: "Invalid request data: missing studentIds" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    console.log("Supabase service client created successfully (bypasses RLS)")

    // Check if user is authenticated
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value
    console.log("Authentication check:", { isAuthenticated })
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Resolve template
    let template: any | null = null
    console.log("=== Template Resolution ===")

    if (templateId) {
      console.log("Attempting to find template by ID:", templateId)
      const byId = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single()
      
      console.log("Template lookup by ID result:", { 
        error: byId.error, 
        data: byId.data ? { id: byId.data.id, title: byId.data.title, is_active: byId.data.is_active } : null 
      })
      
      if (!byId.error && byId.data) {
        template = byId.data
        console.log("✅ Template found by ID:", template.title)
      } else {
        console.log("❌ Template not found by ID, trying by title...")
        // Try by title
        const byTitle = await supabase
          .from("templates")
          .select("*")
          .eq("title", templateId)
          .single()
        
        console.log("Template lookup by title result:", { 
          error: byTitle.error, 
          data: byTitle.data ? { id: byTitle.data.id, title: byTitle.data.title, is_active: byTitle.data.is_active } : null 
        })
        
        if (!byTitle.error && byTitle.data) {
          template = byTitle.data
          console.log("✅ Template found by title:", template.title)
        } else {
          console.log("❌ Template not found by title either")
        }
      }
    } else {
      console.log("No templateId provided, will try to find latest active template")
    }

    if (!template) {
      console.log("=== Fallback: Looking for latest active template ===")
      // Fallback: latest active template
      const latestActive = await supabase
        .from("templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
      
      console.log("Latest active template query result:", { 
        error: latestActive.error, 
        count: latestActive.data?.length || 0,
        data: latestActive.data?.map(t => ({ id: t.id, title: t.title, is_active: t.is_active, created_at: t.created_at }))
      })
      
      if (!latestActive.error && latestActive.data && latestActive.data.length > 0) {
        template = latestActive.data[0]
        console.log("✅ Using latest active template:", template.title)
      } else {
        console.log("❌ No active templates found")
      }
    }

    if (!template) {
      console.log("=== All template resolution attempts failed ===")
      // Let's also check what templates exist in the database
      const allTemplates = await supabase
        .from("templates")
        .select("id, title, is_active, created_at")
        .order("created_at", { ascending: false })
      
      console.log("All templates in database:", { 
        error: allTemplates.error, 
        count: allTemplates.data?.length || 0,
        templates: allTemplates.data
      })
      
      return NextResponse.json(
        { error: "Template not found. Pass a valid template id or title, or create/activate a template." },
        { status: 404 }
      )
    }

    console.log("=== Template resolved successfully ===")
    console.log("Template details:", { 
      id: template.id, 
      title: template.title, 
      is_active: template.is_active,
      file_path: template.file_path 
    })

    // Get template PDF once and cache it
    const templatePdfBytes = await getTemplatePDF(supabase, template)
    console.log("Template PDF loaded, size:", templatePdfBytes.byteLength, "bytes")

    // Prepare base PDF (loaded from template) - do this once
    console.log("=== Loading template PDF into pdf-lib ===")
    const basePdfDoc = await PDFDocument.load(templatePdfBytes)
    console.log("Template PDF loaded successfully, pages:", basePdfDoc.getPageCount())

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .in("id", studentIds)

    console.log("Students query result:", { 
      error: studentsError, 
      count: students?.length || 0,
      studentIds: students?.map(s => ({ id: s.id, name: s.candidate_name }))
    })

    if (studentsError || !students) {
      return NextResponse.json(
        { error: "Students not found" },
        { status: 404 }
      )
    }

    // Generate certificates in batches to avoid Vercel timeout
    const BATCH_SIZE = 3 // Very small batch size for faster processing
    const TOTAL_BATCHES = Math.ceil(students.length / BATCH_SIZE)
    
    console.log(`=== Starting batch certificate generation: ${students.length} students in ${TOTAL_BATCHES} batches of ${BATCH_SIZE} ===`)
    
    const allGeneratedCertificates: any[] = []
    const allCertificateRecords: any[] = []
    
    // Pre-embed fonts once to avoid repeated embedding
    const basePdfDocForFonts = await PDFDocument.load(templatePdfBytes)
    const helveticaFont = await basePdfDocForFonts.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await basePdfDocForFonts.embedFont(StandardFonts.HelveticaBold)
    const timesRomanFont = await basePdfDocForFonts.embedFont(StandardFonts.TimesRoman)
    const timesRomanBoldFont = await basePdfDocForFonts.embedFont(StandardFonts.TimesRomanBold)
    
    // Helper function to get font
    const getFont = (fontFamily: string) => {
      switch (fontFamily) {
        case 'HelveticaBold':
          return helveticaBoldFont
        case 'TimesRoman':
          return timesRomanFont
        case 'TimesRomanBold':
          return timesRomanBoldFont
        default:
          return helveticaFont
      }
    }
    
    for (let batchIndex = 0; batchIndex < TOTAL_BATCHES; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE
      const endIndex = Math.min(startIndex + BATCH_SIZE, students.length)
      const batchStudents = students.slice(startIndex, endIndex)
      
      console.log(`=== Processing batch ${batchIndex + 1}/${TOTAL_BATCHES}: students ${startIndex + 1}-${endIndex} ===`)
      
      // Generate unique certificate numbers for this batch
      const certificateNumbers: string[] = []
      for (let i = 0; i < batchStudents.length; i++) {
        try {
          const { data: certNumber } = await supabase.rpc('generate_certificate_number')
          certificateNumbers.push(certNumber || `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
        } catch (error) {
          // Fallback to timestamp-based number if RPC fails
          const timestamp = Date.now()
          const random = Math.random().toString(36).substr(2, 9)
          certificateNumbers.push(`CERT-${timestamp}-${random}`)
        }
      }

      // Process each student in this batch sequentially
      for (let i = 0; i < batchStudents.length; i++) {
        const student = batchStudents[i]
        const certificateNumber = certificateNumbers[i]
        
        console.log(`Student ${student.candidate_name}: generating certificate with number ${certificateNumber}`)
        
        try {
          console.log(`--- Generating certificate for student: ${student.candidate_name} (ID: ${student.id}) ---`)
          
          // Clone the base template for each student (more efficient than loading from bytes)
          const pdfDoc = await PDFDocument.load(await basePdfDoc.save())
          const pages = pdfDoc.getPages()
          const page = pages[0]

          // Clear existing text from template (optional - preserves background)
          await clearExistingText(page)
          
          // Add text fields with perfect centering
          const config = defaultCertificateConfig

          // Candidate Name with Aadhaar (complete line)
          {
            const parts: string[] = []
            if (student.salutation) parts.push(String(student.salutation).trim())
            if (student.candidate_name) parts.push(String(student.candidate_name).trim())
            if (student.guardian_type && student.name_of_father_husband) {
              parts.push(`${String(student.guardian_type).trim()} ${String(student.name_of_father_husband).trim()}`)
            } else if (student.name_of_father_husband) {
              // default to S/o if guardian_type absent
              parts.push(`S/o ${String(student.name_of_father_husband).trim()}`)
            }
            
            // Add Aadhaar to the same line
            if (student.adhaar) {
              parts.push(`having Adhaar ${String(student.adhaar)}`)
            }
            
            const completeLine = parts.join(" ")
            if (completeLine) {
              // Use centered text for the complete line
              const { x, y } = addCenteredText(
                page,
                completeLine,
                config.candidateName.y,
                config.candidateName.fontSize,
                getFont(config.candidateName.fontFamily),
                config.candidateName.color,
                config.candidateName.maxWidth
              )
              console.log(`  ✓ Added complete candidate line: "${completeLine}" at (${x}, ${y})`)
            }
          }

          // Job Role - Perfectly centered
          if (student.job_role) {
            const { x, y } = addCenteredText(
              page,
              student.job_role,
              config.jobRole.y,
              config.jobRole.fontSize,
              getFont(config.jobRole.fontFamily),
              config.jobRole.color,
              config.jobRole.maxWidth
            )
            console.log(`  ✓ Added centered job role: "${student.job_role}" at (${x}, ${y})`)
          }

          // Training Center
          if (student.training_center) {
            page.drawText(student.training_center, {
              x: config.trainingCenter.x,
              y: page.getHeight() - config.trainingCenter.y,
              size: config.trainingCenter.fontSize,
              font: getFont(config.trainingCenter.fontFamily),
              color: rgb(config.trainingCenter.color[0], config.trainingCenter.color[1], config.trainingCenter.color[2]),
            })
            console.log(`  ✓ Added training center: "${student.training_center}"`)
          }

          // District
          if (student.district) {
            page.drawText(student.district, {
              x: config.district.x,
              y: page.getHeight() - config.district.y,
              size: config.district.fontSize,
              font: getFont(config.district.fontFamily),
              color: rgb(config.district.color[0], config.district.color[1], config.district.color[2]),
            })
            console.log(`  ✓ Added district: "${student.district}"`)
          }

          // State
          if (student.state) {
            page.drawText(student.state, {
              x: config.state.x,
              y: page.getHeight() - config.state.y,
              size: config.state.fontSize,
              font: getFont(config.state.fontFamily),
              color: rgb(config.state.color[0], config.state.color[1], config.state.color[2]),
            })
            console.log(`  ✓ Added state: "${student.state}"`)
          }

          // Assessment Partner
          if (student.assessment_partner) {
            page.drawText(student.assessment_partner, {
              x: config.assessmentPartner.x,
              y: page.getHeight() - config.assessmentPartner.y,
              size: config.assessmentPartner.fontSize,
              font: getFont(config.assessmentPartner.fontFamily),
              color: rgb(config.assessmentPartner.color[0], config.assessmentPartner.color[1], config.assessmentPartner.color[2]),
            })
            console.log(`  ✓ Added assessment partner: "${student.assessment_partner}"`)
          }

          // Enrollment Number
          if (student.enrollment_number) {
            page.drawText(student.enrollment_number, {
              x: config.enrollmentNumber.x,
              y: page.getHeight() - config.enrollmentNumber.y,
              size: config.enrollmentNumber.fontSize,
              font: getFont(config.enrollmentNumber.fontFamily),
              color: rgb(config.enrollmentNumber.color[0], config.enrollmentNumber.color[1], config.enrollmentNumber.color[2]),
            })
            console.log(`  ✓ Added enrollment number: "${student.enrollment_number}"`)
          }

          // Certificate Number
          page.drawText(certificateNumber, {
            x: config.certificateNumber.x,
            y: page.getHeight() - config.certificateNumber.y,
            size: config.certificateNumber.fontSize,
            font: getFont(config.certificateNumber.fontFamily),
            color: rgb(config.certificateNumber.color[0], config.certificateNumber.color[1], config.certificateNumber.color[2]),
          })
          console.log(`  ✓ Added certificate number: "${certificateNumber}"`)

          // Date of Issuance
          const currentDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
          page.drawText(currentDate, {
            x: config.dateOfIssuance.x,
            y: page.getHeight() - config.dateOfIssuance.y,
            size: config.dateOfIssuance.fontSize,
            font: getFont(config.dateOfIssuance.fontFamily),
            color: rgb(config.dateOfIssuance.color[0], config.dateOfIssuance.color[1], config.dateOfIssuance.color[2]),
          })
          console.log(`  ✓ Added date of issuance: "${currentDate}"`)

          // Generate QR code for verification (simplified for speed)
          const qrContent = JSON.stringify({
            studentId: student.id,
            certificateNumber: certificateNumber,
            issuedAt: new Date().toISOString(),
            templateId: template.id,
          })

          // Generate QR code image with smaller size for speed
          const qrCodeDataURL = await QRCode.toDataURL(qrContent, {
            width: 80, // Smaller QR code for faster generation
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          })

          // Convert data URL to buffer
          const qrCodeBuffer = Uint8Array.from(Buffer.from(qrCodeDataURL.split(',')[1], 'base64'))

          // Embed QR code image
          const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer)
          const qrCodeDims = qrCodeImage.scale(1)

          page.drawImage(qrCodeImage, {
            x: config.qrCode.x,
            y: page.getHeight() - config.qrCode.y - qrCodeDims.height,
            width: qrCodeDims.width,
            height: qrCodeDims.height,
          })
          console.log(`  ✓ Added QR code for verification`)

          // Convert to bytes
          const pdfBytes = await pdfDoc.save()
          console.log("  PDF converted, size:", pdfBytes.byteLength, "bytes")

          // Generate unique filename
          const timestamp = Date.now()
          const fileName = `${student.candidate_name?.replace(/[^a-zA-Z0-9]/g, "_") || "STUDENT"}_${timestamp}.pdf`
          const filePath = `generated/${fileName}`
          console.log("  Generated filename:", fileName)

          // Upload to Supabase storage (use same bucket as template downloads: "certificates")
          console.log("  Uploading to Supabase storage...")
          const { error: uploadError } = await supabase.storage
            .from("certificates")
            .upload(filePath, pdfBytes, {
              contentType: "application/pdf",
              upsert: true,
            })

          if (uploadError) {
            console.error("  ❌ Upload error:", uploadError)
            continue
          }
          console.log("  ✅ PDF uploaded successfully to:", filePath)

          // Prepare certificate record for batch insert
          const certificateData = {
            student_id: student.id,
            template_id: template.id,
            file_path: filePath,
            certificate_number: certificateNumber,
            qr_code_data: qrContent,
          }

          allCertificateRecords.push(certificateData)
          // We'll add the certificate ID after database insertion
          allGeneratedCertificates.push({
            studentId: student.id,
            studentName: student.candidate_name,
            filePath: filePath,
            certificateNumber: certificateNumber,
            // Temporary placeholder - will be updated after DB insertion
            id: null,
          })

          console.log(`  ✅ Certificate generated successfully for ${student.candidate_name}`)
        } catch (error) {
          console.error(`  ❌ Error generating certificate for ${student.candidate_name}:`, error)
          continue
        }
      }
      
      console.log(`=== Completed batch ${batchIndex + 1}/${TOTAL_BATCHES} ===`)
    }

    // Batch insert all certificate records
    console.log("=== Batch inserting certificate records ===")
    let insertResults = []
    if (allCertificateRecords.length > 0) {
      // Insert all certificates as new versions (allows regeneration)
      const { data: insertedData, error: insertError } = await supabase
        .from("certificates")
        .insert(allCertificateRecords)
        .select()

      if (insertError) {
        console.error("❌ Batch insert error:", insertError)
        return NextResponse.json(
          { error: "Failed to save certificate records" },
          { status: 500 }
        )
      }

      insertResults = insertedData || []
      console.log(`✅ Successfully inserted ${insertResults.length} certificate records (new versions)`)
      
      // Update generatedCertificates with actual certificate IDs
      for (let i = 0; i < insertResults.length && i < allGeneratedCertificates.length; i++) {
        allGeneratedCertificates[i].id = insertResults[i].id
      }
    }

    console.log("=== Certificate generation completed ===")
    console.log("Summary:", {
      totalStudents: students.length,
      generatedCertificates: allGeneratedCertificates.length,
      savedRecords: insertResults.length,
    })

    return NextResponse.json({
      success: true,
      generatedCertificates: allGeneratedCertificates,
      totalGenerated: allGeneratedCertificates.length,
      totalStudents: students.length,
    })
  } catch (error) {
    console.error("Certificate generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
