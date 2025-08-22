"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { StudentSelector } from "@/components/generate/student-selector"
import { TemplateSelector } from "@/components/generate/template-selector"
import { GenerationPreview } from "@/components/generate/generation-preview"

interface Student {
  id: string
  name: string
  roll_number: string
  course: string
  completion_date: string
  email?: string
  grade?: string
}

interface Template {
  id: string
  title: string
  description?: string
  file_name: string
  mime_type: string
  is_active: boolean
  created_at: string
}

export default function GeneratePage() {
  const [students, setStudents] = useState<Student[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, templatesRes] = await Promise.all([fetch("/api/students"), fetch("/api/templates")])

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json()
          setStudents(studentsData)
        }

        if (templatesRes.ok) {
          const templatesData = await templatesRes.json()
          setTemplates(templatesData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleGenerate = () => {
    // Refresh data after generation
    setSelectedStudents([])
    setSelectedTemplate(null)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Generate Certificates" description="Create certificates for students" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Generate Certificates" description="Select students and template to generate certificates" />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <StudentSelector
              students={students}
              selectedStudents={selectedStudents}
              onSelectionChange={setSelectedStudents}
            />
            <TemplateSelector
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectionChange={setSelectedTemplate}
            />
          </div>

          <div>
            <GenerationPreview
              selectedStudents={selectedStudents}
              selectedTemplate={selectedTemplate}
              onGenerate={handleGenerate}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
