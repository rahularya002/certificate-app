import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get template info
    const { data: template, error: fetchError } = await supabase
      .from("templates")
      .select("file_path, file_name, mime_type")
      .eq("id", params.id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Get signed URL for download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("certificates")
      .createSignedUrl(template.file_path, 60) // 1 minute expiry

    if (urlError || !signedUrlData) {
      console.error("Signed URL error:", urlError)
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 })
    }

    // Fetch the file and return it
    const fileResponse = await fetch(signedUrlData.signedUrl)
    if (!fileResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
    }

    const fileBuffer = await fileResponse.arrayBuffer()

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": template.mime_type,
        "Content-Disposition": `attachment; filename="${template.file_name}"`,
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
