import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params
    const supabase = createServiceClient()
    
    // Check if user is authenticated
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the latest certificate for this student
    const { data: certificate, error } = await supabase
      .from("certificates")
      .select(`
        id,
        certificate_number,
        certificate_version,
        file_path,
        issued_at,
        qr_code_data,
        templates!inner(title)
      `)
      .eq("student_id", studentId)
      .eq("is_revoked", false)
      .order("certificate_version", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error("Error fetching latest certificate:", error)
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      certificate
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
