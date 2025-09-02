import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Batch size for processing large datasets
const BATCH_SIZE = 100

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Allow based on app's cookie-based auth (no Supabase auth session in this app)
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { students } = await request.json()

    if (!students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Invalid students data" }, { status: 400 })
    }

    console.log(`🔄 Processing ${students.length} students in batches of ${BATCH_SIZE}`)

    // Process in batches to avoid timeout
    const batches = []
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      batches.push(students.slice(i, i + BATCH_SIZE))
    }

    let totalInserted = 0
    const errors: any[] = []

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} students)`)

      // Prepare students data for insertion (aligned with current DB schema)
      const studentsData = batch.map((student: any) => ({
        candidate_name: student.candidate_name,
        job_role: student.job_role,
        training_center: student.training_center || null,
        district: student.district || null,
        state: student.state || null,
        assessment_partner: student.assessment_partner || null,
        enrollment_number: student.enrollment_number,
        certificate_number: student.certificate_number || null,
        date_of_issuance: new Date(student.date_of_issuance).toISOString().split("T")[0],
      }))

      // Insert batch into database
      const { data, error } = await supabase
        .from("students")
        .insert(studentsData)
        .select()

      if (error) {
        console.error(`❌ Batch ${batchIndex + 1} error:`, error)
        errors.push({ batch: batchIndex + 1, error: error.message })
        // Continue with next batch instead of failing completely
        continue
      }

      totalInserted += data?.length || 0
      console.log(`✅ Batch ${batchIndex + 1} completed: ${data?.length || 0} students inserted`)
    }

    return NextResponse.json({ 
      success: true, 
      totalInserted,
      totalProcessed: students.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
