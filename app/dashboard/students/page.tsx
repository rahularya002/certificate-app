import { Header } from "@/components/dashboard/header"
import { FileUpload } from "@/components/students/file-upload"
import { StudentsTable } from "@/components/students/students-table"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function StudentsPage() {
  const supabase = await createClient()

  // Fetch all students
  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching students:", error)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Students"
        description="Manage student records and upload data from Excel files"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <FileUpload onUploadComplete={() => window.location.reload()} />
          <StudentsTable students={students || []} onRefresh={() => window.location.reload()} />
        </div>
      </div>
    </div>
  )
}
