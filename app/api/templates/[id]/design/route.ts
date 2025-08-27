import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = createServiceClient()
  const { data, error } = await supabase.from("templates").select("design").eq("id", id).single()
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data?.design || null)
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = createServiceClient()
  const isAuthenticated = req.cookies.get("isAuthenticated")?.value === "true"
  if (!isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const design = await req.json()
  const { error } = await supabase.from("templates").update({ design }).eq("id", id)
  if (error) return NextResponse.json({ error: "Failed to save design" }, { status: 500 })
  return NextResponse.json({ success: true })
}
