"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Check } from "lucide-react"

interface Template {
  id: string
  title: string
  description?: string
  file_name: string
  mime_type: string
  is_active: boolean
  created_at: string
}

interface TemplateSelectorProps {
  templates: Template[]
  selectedTemplate: Template | null
  onSelectionChange: (template: Template | null) => void
}

export function TemplateSelector({ templates, selectedTemplate, onSelectionChange }: TemplateSelectorProps) {
  const activeTemplates = templates.filter((t) => t.is_active)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Select Template
        </CardTitle>
        <CardDescription>Choose a certificate template to use</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active templates found. Please upload and activate a template first.
          </div>
        ) : (
          activeTemplates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id
            return (
              <div
                key={template.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => onSelectionChange(isSelected ? null : template)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{template.title}</h4>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{template.mime_type.split("/")[1].toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Created: {new Date(template.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
