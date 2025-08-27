import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: templates, error } = await supabase
      .from("templates")
      .select("id, title, description, file_path, file_name, file_size, mime_type, is_active, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
    }

    return NextResponse.json(templates || [])
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
