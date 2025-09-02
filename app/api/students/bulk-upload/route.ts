import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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

    // Prepare students data for insertion (aligned with current DB schema)
    const studentsData = students.map((student: any) => ({
      // Removed: salutation, guardian_type, name_of_father_husband
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

    // Insert students into database
    const { data, error } = await supabase.from("students").insert(studentsData).select()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to insert students" }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: data.length })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
