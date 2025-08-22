import { Header } from "@/components/dashboard/header"
import { TemplateUpload } from "@/components/templates/template-upload"
import { TemplatesGrid } from "@/components/templates/templates-grid"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default async function TemplatesPage() {
  const supabase = await createClient()

  // Fetch all templates
  const { data: templates, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching templates:", error)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Templates"
        description="Manage certificate templates and upload new designs"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <TemplateUpload onUploadComplete={() => window.location.reload()} />
          <TemplatesGrid templates={templates || []} onRefresh={() => window.location.reload()} />
        </div>
      </div>
    </div>
  )
}
