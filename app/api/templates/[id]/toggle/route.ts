import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServiceClient()
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { is_active } = await request.json()

    const { data, error } = await supabase.from("templates").update({ is_active }).eq("id", params.id).select().single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
    }

    return NextResponse.json({ success: true, template: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
