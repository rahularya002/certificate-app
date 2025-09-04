import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "100")
    const offset = (page - 1) * limit

    // Get total count
    const { count, error: countError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Count error:", countError)
      return NextResponse.json({ error: "Failed to get student count" }, { status: 500 })
    }

    // Get paginated students
    const { data: students, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }

    return NextResponse.json({
      students: students || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const isAuthenticated = request.cookies.get("isAuthenticated")?.value === "true"
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No student IDs provided" }, { status: 400 })
    }

    const { error } = await supabase
      .from("students")
      .delete()
      .in("id", ids)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete students" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: ids.length 
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
