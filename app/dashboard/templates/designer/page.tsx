"use client"

import { useEffect, useRef, useState } from "react"
import { Designer } from "@pdfme/ui"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Template = {
  id: string
  title: string
  description?: string
  created_at: string
}

export default function TemplateDesignerPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const designerRef = useRef<Designer | null>(null)
  const [templateId, setTemplateId] = useState("")
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates")
        if (res.ok) {
          const data = await res.json()
          setTemplates(data)
        }
      } catch {}
    }
    fetchTemplates()
  }, [])

  const loadDesign = async () => {
    if (!templateId || !containerRef.current) return
    setLoading(true)
    try {
      const designRes = await fetch(`/api/templates/${templateId}/design`)
      const designJson = designRes.ok ? await designRes.json() : null

      const backgroundPdfUrl = `/api/templates/${templateId}/download`

      const initialTemplate = designJson && designJson.schemas
        ? { ...designJson, basePdf: designJson.basePdf || backgroundPdfUrl }
        : {
            basePdf: backgroundPdfUrl,
            schemas: [ {} ],
          }

      if (!designerRef.current) {
        designerRef.current = new Designer({ domContainer: containerRef.current, template: initialTemplate })
      } else {
        designerRef.current.updateTemplate(initialTemplate)
      }
    } finally {
      setLoading(false)
    }
  }

  const saveDesign = async () => {
    if (!templateId || !designerRef.current) return
    const template = designerRef.current.getTemplate()
    await fetch(`/api/templates/${templateId}/design`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    })
    alert("Design saved")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Designer</CardTitle>
        <CardDescription>Select a template or paste an ID, arrange fields, then save.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">Select a template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — {t.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <span>or</span>
          <Input placeholder="Paste Template ID" value={templateId} onChange={(e) => setTemplateId(e.target.value)} />
          <Button onClick={loadDesign} disabled={!templateId || loading}>{loading ? "Loading..." : "Load"}</Button>
          <Button variant="outline" onClick={saveDesign} disabled={!templateId}>
            Save
          </Button>
        </div>
        <div ref={containerRef} style={{ width: "100%", height: "75vh", border: "1px solid var(--border)" }} />
      </CardContent>
    </Card>
  )
}
