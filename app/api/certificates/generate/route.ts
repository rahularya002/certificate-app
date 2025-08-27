import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { defaultCertificateConfig } from "@/lib/certificate-config"

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

        // Add text fields based on certificate config
        const config = defaultCertificateConfig

        // Salutation
        if (student.salutation) {
          page.drawText(student.salutation, {
            x: config.salutation.x,
            y: page.getHeight() - config.salutation.y,
            size: config.salutation.fontSize,
            font: getFont(config.salutation.fontFamily),
            color: rgb(...config.salutation.color),
            maxWidth: config.salutation.maxWidth,
          })
          console.log(`  ✓ Added salutation: "${student.salutation}" at (${config.salutation.x}, ${config.salutation.y})`)
        }

        // Candidate Name
        if (student.candidate_name) {
          page.drawText(student.candidate_name, {
            x: config.candidateName.x,
            y: page.getHeight() - config.candidateName.y,
            size: config.candidateName.fontSize,
            font: getFont(config.candidateName.fontFamily),
            color: rgb(...config.candidateName.color),
            maxWidth: config.candidateName.maxWidth,
          })
          console.log(`  ✓ Added candidate name: "${student.candidate_name}" at (${config.candidateName.x}, ${config.candidateName.y})`)
        }

        // Guardian Type
        if (student.guardian_type) {
          page.drawText(student.guardian_type, {
            x: config.guardianType.x,
            y: page.getHeight() - config.guardianType.y,
            size: config.guardianType.fontSize,
            font: getFont(config.guardianType.fontFamily),
            color: rgb(...config.guardianType.color),
            maxWidth: config.guardianType.maxWidth,
          })
          console.log(`  ✓ Added guardian type: "${student.guardian_type}" at (${config.guardianType.x}, ${config.guardianType.y})`)
        }

        // Name of Father/Husband
        if (student.name_of_father_husband) {
          page.drawText(student.name_of_father_husband, {
            x: config.nameOfFatherHusband.x,
            y: page.getHeight() - config.nameOfFatherHusband.y,
            size: config.nameOfFatherHusband.fontSize,
            font: getFont(config.nameOfFatherHusband.fontFamily),
            color: rgb(...config.nameOfFatherHusband.color),
            maxWidth: config.nameOfFatherHusband.maxWidth,
          })
          console.log(`  ✓ Added father/husband name: "${student.name_of_father_husband}" at (${config.nameOfFatherHusband.x}, ${config.nameOfFatherHusband.y})`)
        }

        // Aadhaar
        if (student.adhaar) {
          page.drawText(student.adhaar, {
            x: config.aadhaar.x,
            y: page.getHeight() - config.aadhaar.y,
            size: config.aadhaar.fontSize,
            font: getFont(config.aadhaar.fontFamily),
            color: rgb(...config.aadhaar.color),
            maxWidth: config.aadhaar.maxWidth,
          })
          console.log(`  ✓ Added aadhaar: "${student.adhaar}" at (${config.aadhaar.x}, ${config.aadhaar.y})`)
        }

        // Job Role
        if (student.job_role) {
          page.drawText(student.job_role, {
            x: config.jobRole.x,
            y: page.getHeight() - config.jobRole.y,
            size: config.jobRole.fontSize,
            font: getFont(config.jobRole.fontFamily),
            color: rgb(...config.jobRole.color),
            maxWidth: config.jobRole.maxWidth,
          })
          console.log(`  ✓ Added job role: "${student.job_role}" at (${config.jobRole.x}, ${config.jobRole.y})`)
        }

        // Training Center
        if (student.training_center) {
          page.drawText(student.training_center, {
            x: config.trainingCenter.x,
            y: page.getHeight() - config.trainingCenter.y,
            size: config.trainingCenter.fontSize,
            font: getFont(config.trainingCenter.fontFamily),
            color: rgb(...config.trainingCenter.color),
            maxWidth: config.trainingCenter.maxWidth,
          })
          console.log(`  ✓ Added training center: "${student.training_center}" at (${config.trainingCenter.x}, ${config.trainingCenter.y})`)
        }

        // District
        if (student.district) {
          page.drawText(student.district, {
            x: config.district.x,
            y: page.getHeight() - config.district.y,
            size: config.district.fontSize,
            font: getFont(config.district.fontFamily),
            color: rgb(...config.district.color),
            maxWidth: config.district.maxWidth,
          })
          console.log(`  ✓ Added district: "${student.district}" at (${config.district.x}, ${config.district.y})`)
        }

        // State
        if (student.state) {
          page.drawText(student.state, {
            x: config.state.x,
            y: page.getHeight() - config.state.y,
            size: config.state.fontSize,
            font: getFont(config.state.fontFamily),
            color: rgb(...config.state.color),
            maxWidth: config.state.maxWidth,
          })
          console.log(`  ✓ Added state: "${student.state}" at (${config.state.x}, ${config.state.y})`)
        }

        // Assessment Partner
        if (student.assessment_partner) {
          page.drawText(student.assessment_partner, {
            x: config.assessmentPartner.x,
            y: page.getHeight() - config.assessmentPartner.y,
            size: config.assessmentPartner.fontSize,
            font: getFont(config.assessmentPartner.fontFamily),
            color: rgb(...config.assessmentPartner.color),
            maxWidth: config.assessmentPartner.maxWidth,
          })
          console.log(`  ✓ Added assessment partner: "${student.assessment_partner}" at (${config.assessmentPartner.x}, ${config.assessmentPartner.y})`)
        }

        // Date of Issuance
        if (student.date_of_issuance) {
          const dateStr = new Date(student.date_of_issuance).toLocaleDateString('en-IN')
          page.drawText(dateStr, {
            x: config.dateOfIssuance.x,
            y: page.getHeight() - config.dateOfIssuance.y,
            size: config.dateOfIssuance.fontSize,
            font: getFont(config.dateOfIssuance.fontFamily),
            color: rgb(...config.dateOfIssuance.color),
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
            color: rgb(...config.enrollmentNumber.color),
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
            color: rgb(...config.certificateNumber.color),
          })
          console.log(`  ✓ Added certificate number: "${student.certificate_number}" at (${config.certificateNumber.x}, ${config.certificateNumber.y})`)
        }

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

        // Check if certificate already exists
        const { data: existingCertificate } = await supabase
          .from("certificates")
          .select("id")
          .eq("student_id", student.id)
          .eq("template_id", template.id)
          .single()

        // Save certificate record to database
        const certificateData = {
          student_id: student.id,
          template_id: template.id,
          file_path: filePath,
          certificate_number: student.certificate_number || `CERT-${timestamp}`,
          qr_code_data: "{}", // Required field - empty JSON object
          // Remove duplicate student data - we'll fetch from students table when needed
          // enrollment_number: student.enrollment_number,
          // date_of_issuance: student.date_of_issuance,
        }

        let certificateId: string

        if (existingCertificate) {
          console.log("  Updating existing certificate...")
          // Update existing certificate
          const { data: updatedCertificate, error: updateError } = await supabase
            .from("certificates")
            .update(certificateData)
            .eq("id", existingCertificate.id)
            .select("id")
            .single()

          if (updateError) {
            console.error("  ❌ Update error:", updateError)
            continue
          }
          certificateId = updatedCertificate.id
          console.log("  ✅ Certificate updated successfully")
        } else {
          console.log("  Creating new certificate...")
          // Insert new certificate
          const { data: newCertificate, error: insertError } = await supabase
            .from("certificates")
            .insert(certificateData)
            .select("id")
            .single()

          if (insertError) {
            console.error("  ❌ Insert error:", insertError)
            continue
          }
          certificateId = newCertificate.id
          console.log("  ✅ Certificate created successfully")
        }

        generatedCertificates.push({
          id: certificateId,
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
