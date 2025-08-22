"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileImage, CheckCircle, AlertCircle } from "lucide-react"

interface TemplateUploadProps {
  onUploadComplete: () => void
}

export function TemplateUpload({ onUploadComplete }: TemplateUploadProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Please select a PDF, JPEG, or PNG file")
        return
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        return
      }

      setFile(selectedFile)
      setError(null)
      setSuccess(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !title.trim()) {
      setError("Please provide a title and select a file")
      return
    }

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title.trim())
      formData.append("description", description.trim())

      setProgress(25)

      const response = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      })

      setProgress(75)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload template")
      }

      setProgress(100)
      setSuccess(true)
      onUploadComplete()

      // Reset form
      setTimeout(() => {
        setTitle("")
        setDescription("")
        setFile(null)
        setProgress(0)
        setSuccess(false)
        const input = document.getElementById("template-file") as HTMLInputElement
        if (input) input.value = ""
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Upload Certificate Template
        </CardTitle>
        <CardDescription>Upload a PDF or image file to use as a certificate template</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Template Title</Label>
            <Input
              id="title"
              placeholder="e.g., Course Completion Certificate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-file">Template File</Label>
            <Input
              id="template-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isUploading}
              required
            />
            <p className="text-xs text-muted-foreground">Supported formats: PDF, JPEG, PNG (max 10MB)</p>
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileImage className="h-4 w-4" />
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Template uploaded successfully!</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!file || !title.trim() || isUploading} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Template"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
