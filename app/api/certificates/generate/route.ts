import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"

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

    const { studentIds, templateId } = await request.json()

    if (!studentIds || !Array.isArray(studentIds) || !templateId) {
      return NextResponse.json({ error: "Student IDs and template ID are required" }, { status: 400 })
    }

    // Fetch students and template
    const [studentsResult, templateResult] = await Promise.all([
      supabase.from("students").select("*").in("id", studentIds),
      supabase.from("templates").select("*").eq("id", templateId).eq("is_active", true).single(),
    ])

    if (studentsResult.error || !studentsResult.data) {
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }

    if (templateResult.error || !templateResult.data) {
      return NextResponse.json({ error: "Template not found or inactive" }, { status: 404 })
    }

    const students = studentsResult.data
    const template = templateResult.data
    const certificates = []

    // Generate certificates for each student
    for (const student of students) {
      try {
        // Generate certificate number
        const { data: certNumber } = await supabase.rpc("generate_certificate_number")

        // Generate QR code data
        const qrData = {
          name: student.name,
          rollNumber: student.roll_number,
          course: student.course,
          completionDate: student.completion_date,
          certificateNumber: certNumber,
          issuedAt: new Date().toISOString(),
          verifyUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/verify/${certNumber}`,
        }

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 200,
          margin: 2,
        })

        // Insert certificate record
        const { data: certificate, error: insertError } = await supabase
          .from("certificates")
          .insert({
            student_id: student.id,
            template_id: templateId,
            certificate_number: certNumber,
            qr_code_data: JSON.stringify(qrData),
            issued_by: user.id,
          })
          .select(`
            *,
            students (name, roll_number, course)
          `)
          .single()

        if (insertError) {
          console.error("Error inserting certificate:", insertError)
          continue
        }

        certificates.push({
          ...certificate,
          student_name: student.name,
          qr_code_url: qrCodeDataUrl,
        })
      } catch (error) {
        console.error(`Error generating certificate for student ${student.id}:`, error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      certificates,
      count: certificates.length,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
