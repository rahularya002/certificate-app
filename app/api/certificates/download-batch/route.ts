import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

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

    // Fetch certificates (no relational selects)
    const { data: certificates, error } = await supabase
      .from("certificates")
      .select("id, file_path, certificate_number, student_id")
      .in("id", certificateIds)

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

    for (const certificate of certificates) {
      try {
        // Get signed URL for generated certificate file
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from("certificates")
          .createSignedUrl(certificate.file_path, 60)

        if (urlError || !signedUrlData) {
          console.error("Signed URL error:", urlError)
          continue
        }

        // Fetch generated certificate file
        const fileResponse = await fetch(signedUrlData.signedUrl)
        if (!fileResponse.ok) {
          console.error("Failed to fetch certificate file")
          continue
        }

        const fileBuffer = await fileResponse.arrayBuffer()
        
        // Build filename
        const studentName = (studentIdToName.get(certificate.student_id) || "STUDENT").replace(/[^a-zA-Z0-9]/g, "_")
        const fileName = `${studentName}_${certificate.certificate_number}.pdf`
        
        // Add generated certificate to ZIP
        zip.file(fileName, fileBuffer)
      } catch (error) {
        console.error(`Error processing certificate ${certificate.id}:`, error)
        continue
      }
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="certificates-${new Date().toISOString().split("T")[0]}.zip"`,
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
