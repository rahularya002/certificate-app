import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

// Batch size for parallel processing
const BATCH_SIZE = 10

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { certificateIds } = await request.json()

    if (!certificateIds || !Array.isArray(certificateIds)) {
      return NextResponse.json({ error: "Certificate IDs are required" }, { status: 400 })
    }

    console.log(`🔄 Processing ${certificateIds.length} certificates for batch download`)

    // Fetch certificates (no relational selects) - get latest version for each student/template
    const { data: certificates, error } = await supabase
      .from("certificates")
      .select("id, file_path, certificate_number, student_id, template_id, certificate_version")
      .in("id", certificateIds)
      .eq("is_revoked", false)
      .order("certificate_version", { ascending: false })

    if (error || !certificates) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 })
    }

    // Fetch student names for filenames
    const studentIds = Array.from(new Set(certificates.map((c) => c.student_id)))
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, candidate_name")
      .in("id", studentIds)

    if (studentsError) {
      console.error("Students fetch error:", studentsError)
    }

    const studentIdToName = new Map<string, string>()
    for (const s of studentsData || []) {
      studentIdToName.set(s.id, s.candidate_name)
    }

    // Create ZIP file
    const zip = new JSZip()
    let processedCount = 0
    const errors: any[] = []

    // Process certificates in parallel batches
    for (let i = 0; i < certificates.length; i += BATCH_SIZE) {
      const batch = certificates.slice(i, i + BATCH_SIZE)
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(certificates.length / BATCH_SIZE)} (${batch.length} certificates)`)

      // Process batch in parallel
      const batchPromises = batch.map(async (certificate) => {
        try {
          // Get signed URL for generated certificate file
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from("certificates")
            .createSignedUrl(certificate.file_path, 60)

          if (urlError || !signedUrlData) {
            console.error("Signed URL error:", urlError)
            throw new Error(`Failed to get signed URL for certificate ${certificate.id}`)
          }

          // Fetch generated certificate file
          const fileResponse = await fetch(signedUrlData.signedUrl)
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch certificate file for ${certificate.id}`)
          }

          const fileBuffer = await fileResponse.arrayBuffer()
          
                  // Build filename with version
        const studentName = (studentIdToName.get(certificate.student_id) || "STUDENT").replace(/[^a-zA-Z0-9]/g, "_")
        const fileName = `${studentName}_${certificate.certificate_number}_v${certificate.certificate_version}.pdf`
          
          return { fileName, fileBuffer, certificateId: certificate.id }
        } catch (error) {
          console.error(`Error processing certificate ${certificate.id}:`, error)
          throw error
        }
      })

      // Wait for batch to complete
      try {
        const batchResults = await Promise.allSettled(batchPromises)
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            const { fileName, fileBuffer } = result.value
            zip.file(fileName, fileBuffer)
            processedCount++
          } else {
            errors.push(result.reason)
          }
        }
      } catch (batchError) {
        console.error(`Batch processing error:`, batchError)
        errors.push(batchError)
      }
    }

    console.log(`✅ Processed ${processedCount}/${certificates.length} certificates successfully`)

    if (processedCount === 0) {
      return NextResponse.json({ 
        error: "No certificates could be processed", 
        details: errors 
      }, { status: 500 })
    }

    // Generate ZIP file
    console.log("📦 Generating ZIP file...")
    const zipBuffer = await zip.generateAsync({ 
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    })

    console.log(`✅ ZIP generated successfully: ${zipBuffer.length} bytes`)

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates-${new Date().toISOString().split("T")[0]}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
