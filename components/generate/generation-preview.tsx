"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Award, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

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
  file_name: string
}

interface GenerationPreviewProps {
  selectedStudents: Student[]
  selectedTemplate: Template | null
  onGenerate: () => void
}

export function GenerationPreview({ selectedStudents, selectedTemplate, onGenerate }: GenerationPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedCertificates, setGeneratedCertificates] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const canGenerate = selectedStudents.length > 0 && selectedTemplate

  const handleGenerate = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setProgress(0)
    setError(null)
    setGeneratedCertificates([])

    try {
      const response = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentIds: selectedStudents.map((s) => s.id),
          templateId: selectedTemplate.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate certificates")
      }

      const result = await response.json()
      setGeneratedCertificates(result.certificates)
      setProgress(100)
      onGenerate()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadAll = async () => {
    if (generatedCertificates.length === 0) return

    try {
      const response = await fetch("/api/certificates/download-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          certificateIds: generatedCertificates.map((c) => c.id),
        }),
      })

      if (!response.ok) throw new Error("Failed to download certificates")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `certificates-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading certificates:", error)
      alert("Failed to download certificates")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Generate Certificates
        </CardTitle>
        <CardDescription>Review your selection and generate certificates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Students selected:</span>
            <span className="font-medium">{selectedStudents.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Template:</span>
            <span className="font-medium">{selectedTemplate?.title || "None selected"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Certificates to generate:</span>
            <span className="font-medium">{canGenerate ? selectedStudents.length : 0}</span>
          </div>
        </div>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating certificates...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success */}
        {generatedCertificates.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Successfully generated {generatedCertificates.length} certificates!</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating} className="flex-1">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Award className="h-4 w-4 mr-2" />
                Generate Certificates
              </>
            )}
          </Button>

          {generatedCertificates.length > 0 && (
            <Button variant="outline" onClick={handleDownloadAll}>
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          )}
        </div>

        {/* Generated Certificates List */}
        {generatedCertificates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Generated Certificates:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {generatedCertificates.map((cert: any) => (
                <div key={cert.id} className="flex items-center justify-between text-sm p-2 rounded border">
                  <span>{cert.student_name}</span>
                  <span className="text-muted-foreground">{cert.certificate_number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
