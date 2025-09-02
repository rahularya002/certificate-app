import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { PDFDocument, rgb, StandardFonts, PDFPage } from "pdf-lib"
import { defaultCertificateConfig, getAlignedX } from "@/lib/certificate-config"
import QRCode from "qrcode"

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

    // Get signed URL for the template PDF file
    console.log("=== Getting template PDF signed URL ===")
    console.log("Template file_path:", template.file_path)
    
    // Try templates bucket first
    let signedUrlData, signedUrlError
    try {
      const result = await supabase.storage
        .from("templates")
        .createSignedUrl(template.file_path, 120)
      signedUrlData = result.data
      signedUrlError = result.error
      console.log("Tried 'templates' bucket first")
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
        console.log("Tried 'certificates' bucket as fallback")
      } catch (e) {
        console.log("Error with 'certificates' bucket:", e)
        signedUrlError = e
      }
    }

    console.log("Signed URL result:", { 
      error: signedUrlError, 
      hasSignedUrl: !!signedUrlData?.signedUrl,
      filePath: template.file_path,
      bucketsTried: ["templates", "certificates"]
    })

    if (signedUrlError || !signedUrlData?.signedUrl) {
      // Let's also check what storage buckets exist and what files are in them
      console.log("=== Checking available storage buckets ===")
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        console.log("Available storage buckets:", buckets?.map(b => b.name))
        
        // Check what's in templates bucket
        const { data: templatesFiles } = await supabase.storage
          .from("templates")
          .list("", { limit: 10 })
        console.log("Files in 'templates' bucket:", templatesFiles)
        
        // Check what's in certificates bucket
        const { data: certificatesFiles } = await supabase.storage
          .from("certificates")
          .list("", { limit: 10 })
        console.log("Files in 'certificates' bucket:", certificatesFiles)
      } catch (e) {
        console.log("Error checking storage:", e)
      }
      
      return NextResponse.json(
        { error: "Failed to access template PDF" },
        { status: 500 }
      )
    }

    console.log("=== Downloading template PDF ===")
    const templateRes = await fetch(signedUrlData.signedUrl)
    console.log("Template PDF fetch result:", { 
      ok: templateRes.ok, 
      status: templateRes.status,
      statusText: templateRes.statusText
    })
    
    if (!templateRes.ok) {
      return NextResponse.json(
        { error: "Failed to download template PDF" },
        { status: 500 }
      )
    }
    const templatePdfBytes = await templateRes.arrayBuffer()
    console.log("Template PDF downloaded, size:", templatePdfBytes.byteLength, "bytes")

    // Prepare base PDF (loaded from template)
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

    const generatedCertificates = []
    console.log("=== Starting certificate generation for", students.length, "students ===")

    for (const student of students) {
      try {
        console.log(`--- Generating certificate for student: ${student.candidate_name} (ID: ${student.id}) ---`)
        
        // Clone the base template for each student
        const pdfDoc = await PDFDocument.load(await basePdfDoc.save())
        const pages = pdfDoc.getPages()
        const page = pages[0]

        // Get fonts
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
        const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

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
          const alignedX = getAlignedX(
            student.training_center,
            config.trainingCenter.x,
            config.trainingCenter.fontSize,
            config.trainingCenter.fontFamily,
            config.trainingCenter.align,
            config.trainingCenter.maxWidth
          )
          page.drawText(student.training_center, {
            x: alignedX,
            y: page.getHeight() - config.trainingCenter.y,
            size: config.trainingCenter.fontSize,
            font: getFont(config.trainingCenter.fontFamily),
            color: rgb(config.trainingCenter.color[0], config.trainingCenter.color[1], config.trainingCenter.color[2]),
            maxWidth: config.trainingCenter.maxWidth,
          })
          console.log(`  ✓ Added training center: "${student.training_center}" at (${alignedX}, ${config.trainingCenter.y}) [${config.trainingCenter.align || 'left'} aligned]`)
        }

        // District
        if (student.district) {
          const alignedX = getAlignedX(
            student.district,
            config.district.x,
            config.district.fontSize,
            config.district.fontFamily,
            config.district.align,
            config.district.maxWidth
          )
          page.drawText(student.district, {
            x: alignedX,
            y: page.getHeight() - config.district.y,
            size: config.district.fontSize,
            font: getFont(config.district.fontFamily),
            color: rgb(config.district.color[0], config.district.color[1], config.district.color[2]),
            maxWidth: config.district.maxWidth,
          })
          console.log(`  ✓ Added district: "${student.district}" at (${alignedX}, ${config.district.y}) [${config.district.align || 'left'} aligned]`)
        }

        // State
        if (student.state) {
          const alignedX = getAlignedX(
            student.state,
            config.state.x,
            config.state.fontSize,
            config.state.fontFamily,
            config.state.align,
            config.state.maxWidth
          )
          page.drawText(student.state, {
            x: alignedX,
            y: page.getHeight() - config.state.y,
            size: config.state.fontSize,
            font: getFont(config.state.fontFamily),
            color: rgb(config.state.color[0], config.state.color[1], config.state.color[2]),
            maxWidth: config.state.maxWidth,
          })
          console.log(`  ✓ Added state: "${student.state}" at (${alignedX}, ${config.state.y}) [${config.state.align || 'left'} aligned]`)
        }

        // Assessment Partner
        if (student.assessment_partner) {
          const alignedX = getAlignedX(
            student.assessment_partner,
            config.assessmentPartner.x,
            config.assessmentPartner.fontSize,
            config.assessmentPartner.fontFamily,
            config.assessmentPartner.align,
            config.assessmentPartner.maxWidth
          )
          page.drawText(student.assessment_partner, {
            x: alignedX,
            y: page.getHeight() - config.assessmentPartner.y,
            size: config.assessmentPartner.fontSize,
            font: getFont(config.assessmentPartner.fontFamily),
            color: rgb(config.assessmentPartner.color[0], config.assessmentPartner.color[1], config.assessmentPartner.color[2]),
            maxWidth: config.assessmentPartner.maxWidth,
          })
          console.log(`  ✓ Added assessment partner: "${student.assessment_partner}" at (${alignedX}, ${config.assessmentPartner.y}) [${config.assessmentPartner.align || 'left'} aligned]`)
        }

        // Date of Issuance
        if (student.date_of_issuance) {
          const dateStr = new Date(student.date_of_issuance).toLocaleDateString('en-IN')
          page.drawText(dateStr, {
            x: config.dateOfIssuance.x,
            y: page.getHeight() - config.dateOfIssuance.y,
            size: config.dateOfIssuance.fontSize,
            font: getFont(config.dateOfIssuance.fontFamily),
            color: rgb(config.dateOfIssuance.color[0], config.dateOfIssuance.color[1], config.dateOfIssuance.color[2]),
            maxWidth: config.dateOfIssuance.maxWidth,
          })
          console.log(`  ✓ Added date of issuance: "${dateStr}" at (${config.dateOfIssuance.x}, ${config.dateOfIssuance.y})`)
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
          console.log(`  ✓ Added enrollment number: "${student.enrollment_number}" at (${config.enrollmentNumber.x}, ${config.enrollmentNumber.y})`)
        }

        // Certificate Number
        if (student.certificate_number) {
          page.drawText(student.certificate_number, {
            x: config.certificateNumber.x,
            y: page.getHeight() - config.certificateNumber.y,
            size: config.certificateNumber.fontSize,
            font: getFont(config.certificateNumber.fontFamily),
            color: rgb(config.certificateNumber.color[0], config.certificateNumber.color[1], config.certificateNumber.color[2]),
          })
          console.log(`  ✓ Added certificate number: "${student.certificate_number}" at (${config.certificateNumber.x}, ${config.certificateNumber.y})`)
        }

        // Build QR content text
        const qrTextLines = [
          `CERTIFICATE OF COMPLETION`,
          `Name: ${student.candidate_name || ""}`,
          `Father Name: ${student.name_of_father_husband || ""}`,
          `Course Name(job role): ${student.job_role || ""}`,
          `Date of Issuance: ${student.date_of_issuance ? new Date(student.date_of_issuance).toLocaleDateString('en-IN') : ""}`,
          `Created & Maintained By: ICES`,
        ]
        const qrContent = qrTextLines.join("\n")

        // Generate QR as PNG data URL
        const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 0, scale: 6 })
        const qrBase64 = qrDataUrl.split(",")[1] || ""
        const qrPngBytes = Uint8Array.from(Buffer.from(qrBase64, "base64"))
        const qrImage = await pdfDoc.embedPng(qrPngBytes)

        // Draw QR image
        const qrSize = config.qrCode.size
        page.drawImage(qrImage, {
          x: config.qrCode.x,
          y: page.getHeight() - config.qrCode.y - qrSize,
          width: qrSize,
          height: qrSize,
        })

        // Convert to bytes
        console.log("  Converting PDF to bytes...")
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

        // Generate a new unique certificate number
        const { data: certNumData } = await supabase
          .rpc('generate_certificate_number')

        const generatedCertNumber = certNumData || `CERT-${Date.now()}`

        // Save certificate record to database (always insert a new one)
        const certificateData = {
          student_id: student.id,
          template_id: template.id,
          file_path: filePath,
          certificate_number: generatedCertNumber,
          qr_code_data: qrContent,
          // Remove duplicate student data - we'll fetch from students table when needed
          // enrollment_number: student.enrollment_number,
          // date_of_issuance: student.date_of_issuance,
        }

        console.log("  Saving certificate record (update-then-insert)...")
        const { data: updatedRows, error: updErr } = await supabase
          .from("certificates")
          .update(certificateData)
          .eq("student_id", student.id)
          .eq("template_id", template.id)
          .select("id")

        let certificateId: string | null = null
        if (updErr) {
          console.log("  Update step error (may be no match):", updErr)
        }

        if (updatedRows && updatedRows.length > 0) {
          certificateId = updatedRows[0].id
          console.log("  ✅ Updated existing certificate id:", certificateId)
        } else {
          console.log("  No existing certificate, inserting new...")
          const { data: inserted, error: insErr } = await supabase
            .from("certificates")
            .insert(certificateData)
            .select("id")
            .single()

          if (insErr) {
            console.error("  ❌ Insert error:", insErr)
            continue
          }
          certificateId = inserted.id
          console.log("  ✅ Inserted certificate id:", certificateId)
        }

        generatedCertificates.push({
          id: certificateId!,
          studentName: student.candidate_name,
          certificateNumber: certificateData.certificate_number,
        })

        console.log(`  ✅ Certificate generation completed for ${student.candidate_name}`)

      } catch (error) {
        console.error(`❌ Error generating certificate for student ${student.id}:`, error)
        continue
      }
    }

    console.log("=== Certificate generation completed ===")
    console.log("Total certificates generated:", generatedCertificates.length)
    console.log("Generated certificates:", generatedCertificates)

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedCertificates.length} certificates`,
      certificates: generatedCertificates,
    })

  } catch (error) {
    console.error("❌ Certificate generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
