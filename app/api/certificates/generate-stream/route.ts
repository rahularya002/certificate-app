import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib"
import QRCode from "qrcode"
import { defaultCertificateConfig } from "@/lib/certificate-config"

// Helper function to clear existing text (simplified)
async function clearExistingText(page: any) {
  // For now, we'll skip clearing text to save time
  // This can be implemented later if needed
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

export async function POST(request: NextRequest) {
  try {
    const { studentIds, templateId } = await request.json()

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Student IDs array is required" },
        { status: 400 }
      )
    }

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Get template PDF
    const { data: templatePdfBytes, error: templatePdfError } = await supabase.storage
      .from("certificates")
      .download(template.file_path)

    if (templatePdfError || !templatePdfBytes) {
      return NextResponse.json(
        { error: "Failed to access template PDF" },
        { status: 404 }
      )
    }

    // Get students
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .in("id", studentIds)

    if (studentsError || !students) {
      return NextResponse.json(
        { error: "Students not found" },
        { status: 404 }
      )
    }

    // Set up streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial response
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            totalStudents: students.length,
            message: 'Starting certificate generation...'
          })}\n\n`))

          // Process in very small batches
          const BATCH_SIZE = 2
          const TOTAL_BATCHES = Math.ceil(students.length / BATCH_SIZE)
          
          let totalGenerated = 0
          const allGeneratedCertificates: any[] = []
          const allCertificateRecords: any[] = []

          // Pre-embed fonts once
          const basePdfDocForFonts = await PDFDocument.load(await templatePdfBytes.arrayBuffer())
          const helveticaFont = await basePdfDocForFonts.embedFont(StandardFonts.Helvetica)
          const helveticaBoldFont = await basePdfDocForFonts.embedFont(StandardFonts.HelveticaBold)
          const timesRomanFont = await basePdfDocForFonts.embedFont(StandardFonts.TimesRoman)
          const timesRomanBoldFont = await basePdfDocForFonts.embedFont(StandardFonts.TimesRomanBold)
          
          const getFont = (fontFamily: string) => {
            switch (fontFamily) {
              case 'HelveticaBold': return helveticaBoldFont
              case 'TimesRoman': return timesRomanFont
              case 'TimesRomanBold': return timesRomanBoldFont
              default: return helveticaFont
            }
          }

          for (let batchIndex = 0; batchIndex < TOTAL_BATCHES; batchIndex++) {
            const startIndex = batchIndex * BATCH_SIZE
            const endIndex = Math.min(startIndex + BATCH_SIZE, students.length)
            const batchStudents = students.slice(startIndex, endIndex)
            
            // Send batch start
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'batch_start',
              batchIndex: batchIndex + 1,
              totalBatches: TOTAL_BATCHES,
              studentsInBatch: batchStudents.length
            })}\n\n`))

            // Generate certificate numbers for this batch
            const certificateNumbers: string[] = []
            for (let i = 0; i < batchStudents.length; i++) {
              try {
                const { data: certNumber } = await supabase.rpc('generate_certificate_number')
                certificateNumbers.push(certNumber || `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
              } catch (error) {
                const timestamp = Date.now()
                const random = Math.random().toString(36).substr(2, 9)
                certificateNumbers.push(`CERT-${timestamp}-${random}`)
              }
            }

            // Process each student in batch
            for (let i = 0; i < batchStudents.length; i++) {
              const student = batchStudents[i]
              const certificateNumber = certificateNumbers[i]
              
              try {
                // Send student start
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'student_start',
                  studentName: student.candidate_name,
                  studentIndex: startIndex + i + 1,
                  totalStudents: students.length
                })}\n\n`))

                // Generate certificate
                const pdfDoc = await PDFDocument.load(await templatePdfBytes.arrayBuffer())
                const pages = pdfDoc.getPages()
                const page = pages[0]
                const config = defaultCertificateConfig

                // Add text fields (simplified for speed)
                if (student.candidate_name) {
                  const { x, y } = addCenteredText(
                    page, student.candidate_name,
                    config.candidateName.y,
                    config.candidateName.fontSize,
                    getFont(config.candidateName.fontFamily),
                    config.candidateName.color,
                    config.candidateName.maxWidth
                  )
                }

                if (student.job_role) {
                  const { x, y } = addCenteredText(
                    page, student.job_role,
                    config.jobRole.y,
                    config.jobRole.fontSize,
                    getFont(config.jobRole.fontFamily),
                    config.jobRole.color,
                    config.jobRole.maxWidth
                  )
                }

                // Add other fields...
                if (student.training_center) {
                  page.drawText(student.training_center, {
                    x: config.trainingCenter.x,
                    y: page.getHeight() - config.trainingCenter.y,
                    size: config.trainingCenter.fontSize,
                    font: getFont(config.trainingCenter.fontFamily),
                    color: rgb(config.trainingCenter.color[0], config.trainingCenter.color[1], config.trainingCenter.color[2]),
                  })
                }

                // Certificate number
                page.drawText(certificateNumber, {
                  x: config.certificateNumber.x,
                  y: page.getHeight() - config.certificateNumber.y,
                  size: config.certificateNumber.fontSize,
                  font: getFont(config.certificateNumber.fontFamily),
                  color: rgb(config.certificateNumber.color[0], config.certificateNumber.color[1], config.certificateNumber.color[2]),
                })

                // Date
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

                // Simple QR code
                const qrContent = JSON.stringify({
                  studentId: student.id,
                  certificateNumber: certificateNumber,
                  issuedAt: new Date().toISOString(),
                  templateId: template.id,
                })

                const qrCodeDataURL = await QRCode.toDataURL(qrContent, {
                  width: 60,
                  margin: 1,
                  color: { dark: '#000000', light: '#FFFFFF' },
                })

                const qrCodeBuffer = Uint8Array.from(Buffer.from(qrCodeDataURL.split(',')[1], 'base64'))
                const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer)
                const qrCodeDims = qrCodeImage.scale(1)

                page.drawImage(qrCodeImage, {
                  x: config.qrCode.x,
                  y: page.getHeight() - config.qrCode.y - qrCodeDims.height,
                  width: qrCodeDims.width,
                  height: qrCodeDims.height,
                })

                // Save PDF
                const pdfBytes = await pdfDoc.save()
                const timestamp = Date.now()
                const fileName = `${student.candidate_name?.replace(/[^a-zA-Z0-9]/g, "_") || "STUDENT"}_${timestamp}.pdf`

                // Prepare records (without file_path since we're not storing)
                const certificateData = {
                  student_id: student.id,
                  template_id: template.id,
                  file_path: null, // No file path since we're not storing
                  certificate_number: certificateNumber,
                  qr_code_data: qrContent,
                }

                allCertificateRecords.push(certificateData)
                allGeneratedCertificates.push({
                  studentId: student.id,
                  studentName: student.candidate_name,
                  fileName: fileName,
                  certificateNumber: certificateNumber,
                  pdfBytes: pdfBytes, // Store the actual PDF bytes
                  id: null,
                })

                totalGenerated++

                // Send student success (without PDF data to avoid JSON truncation)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'student_success',
                  studentName: student.candidate_name,
                  totalGenerated,
                  totalStudents: students.length,
                  certificateNumber: certificateNumber,
                  fileName: fileName
                })}\n\n`))

                // Send PDF data in chunks to avoid JSON size limits
                const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
                const chunkSize = 10000 // 10KB chunks
                const chunks = Math.ceil(pdfBase64.length / chunkSize)
                
                for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
                  const start = chunkIndex * chunkSize
                  const end = Math.min(start + chunkSize, pdfBase64.length)
                  const chunk = pdfBase64.substring(start, end)
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'pdf_chunk',
                    studentId: student.id,
                    studentName: student.candidate_name,
                    fileName: fileName,
                    certificateNumber: certificateNumber,
                    chunkIndex: chunkIndex,
                    totalChunks: chunks,
                    chunk: chunk
                  })}\n\n`))
                }

              } catch (error) {
                // Send student error
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'student_error',
                  studentName: student.candidate_name,
                  error: error instanceof Error ? error.message : 'Unknown error'
                })}\n\n`))
              }
            }

            // Send batch complete
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'batch_complete',
              batchIndex: batchIndex + 1,
              totalBatches: TOTAL_BATCHES,
              totalGenerated
            })}\n\n`))
          }

          // Insert all records to database
          if (allCertificateRecords.length > 0) {
            const { data: insertedData, error: insertError } = await supabase
              .from("certificates")
              .insert(allCertificateRecords)
              .select()

            if (insertError) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: 'Failed to save certificate records'
              })}\n\n`))
            } else {
              // Update with actual IDs
              for (let i = 0; i < insertedData.length && i < allGeneratedCertificates.length; i++) {
                allGeneratedCertificates[i].id = insertedData[i].id
              }
            }
          }

          // Send final success (without PDF data to avoid JSON truncation)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            success: true,
            totalGenerated: allGeneratedCertificates.length,
            totalStudents: students.length,
          })}\n\n`))

        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error("Certificate generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
