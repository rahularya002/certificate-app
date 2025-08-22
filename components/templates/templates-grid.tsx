"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Edit, Trash2, Download, ToggleLeft, ToggleRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface Template {
  id: string
  title: string
  description?: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  is_active: boolean
  created_at: string
}

interface TemplatesGridProps {
  templates: Template[]
  onRefresh: () => void
}

export function TemplatesGrid({ templates, onRefresh }: TemplatesGridProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState<string | null>(null)

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    setIsDeleting(templateId)
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      onRefresh()
    } catch (error) {
      console.error("Error deleting template:", error)
      alert("Failed to delete template")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    setIsToggling(templateId)
    try {
      const response = await fetch(`/api/templates/${templateId}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update template status")
      }

      onRefresh()
    } catch (error) {
      console.error("Error toggling template:", error)
      alert("Failed to update template status")
    } finally {
      setIsToggling(null)
    }
  }

  const handleDownload = async (template: Template) => {
    try {
      const response = await fetch(`/api/templates/${template.id}/download`)
      if (!response.ok) throw new Error("Failed to download template")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = template.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading template:", error)
      alert("Failed to download template")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (templates.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No templates found. Upload your first certificate template to get started.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className={`${!template.is_active ? "opacity-60" : ""}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{template.title}</CardTitle>
                {template.description && <CardDescription>{template.description}</CardDescription>}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload(template)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(template)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleActive(template.id, template.is_active)}
                    disabled={isToggling === template.id}
                  >
                    {template.is_active ? (
                      <ToggleLeft className="h-4 w-4 mr-2" />
                    ) : (
                      <ToggleRight className="h-4 w-4 mr-2" />
                    )}
                    {isToggling === template.id ? "Updating..." : template.is_active ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(template.id)}
                    disabled={isDeleting === template.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting === template.id ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{template.mime_type.split("/")[1].toUpperCase()}</Badge>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div>Size: {formatFileSize(template.file_size)}</div>
                <div>Created: {new Date(template.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
