import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { students } = await request.json()

    if (!students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Invalid students data" }, { status: 400 })
    }

    // Prepare students data for insertion
    const studentsData = students.map((student: any) => ({
      name: student.name,
      roll_number: student.rollNumber,
      course: student.course,
      completion_date: new Date(student.completionDate).toISOString().split("T")[0],
      email: student.email || null,
      phone: student.phone || null,
      grade: student.grade || null,
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
