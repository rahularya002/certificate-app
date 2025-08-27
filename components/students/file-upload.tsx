"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"

interface Student {
  salutation?: string
  candidate_name: string
  guardian_type?: string
  name_of_father_husband?: string
  adhaar?: string
  job_role: string
  training_center?: string
  district?: string
  state?: string
  assessment_partner?: string
  enrollment_number: string
  certificate_number?: string
  date_of_issuance: string
}

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [shouldRefresh, setShouldRefresh] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setSuccess(false)
    }
  }

  const parseExcelFile = (file: File): Promise<Student[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          console.log("[v0] Raw Excel data:", jsonData)
          console.log("[v0] Available columns:", Object.keys(jsonData[0] || {}))

          const students: Student[] = jsonData.map((row: any, index: number) => {
            const getCandidateName = () => {
              const nameFields = [
                "Candidate Name",
                "Name",
                "name",
                "CANDIDATE_NAME",
                "Student Name",
                "StudentName",
                "Full Name",
                "FullName",
              ]
              for (const field of nameFields) {
                if (row[field] && String(row[field]).trim()) return String(row[field]).trim()
              }
              return ""
            }

            const getEnrollmentNumber = () => {
              const rollFields = [
                "Enrollment Number",
                "Roll Number",
                "rollNumber",
                "ENROLLMENT_NUMBER",
                "Roll No",
                "RollNo",
                "Student ID",
                "StudentID",
                "ID",
              ]
              for (const field of rollFields) {
                if (row[field] && String(row[field]).trim()) return String(row[field]).trim()
              }
              return ""
            }

            const getJobRole = () => {
              const courseFields = [
                "Job Role",
                "Course",
                "course",
                "JOB_ROLE",
                "COURSE",
                "Program",
                "program",
                "Course Name",
                "CourseName",
              ]
              for (const field of courseFields) {
                if (row[field] && String(row[field]).trim()) return String(row[field]).trim()
              }
              return ""
            }

            const getDateOfIssuance = () => {
              const dateFields = [
                "Date of Issuance",
                "Completion Date",
                "completionDate",
                "DATE_OF_ISSUANCE",
                "Date",
                "date",
                "COMPLETION_DATE",
                "Completion",
                "End Date",
                "EndDate",
              ]
              for (const field of dateFields) {
                if (row[field]) {
                  const dateValue = row[field]
                  if (typeof dateValue === "number") {
                    // Excel date serial number
                    const excelDate = new Date((dateValue - 25569) * 86400 * 1000)
                    return excelDate.toISOString().split("T")[0]
                  } else if (dateValue) {
                    const parsedDate = new Date(dateValue)
                    if (!isNaN(parsedDate.getTime())) {
                      return parsedDate.toISOString().split("T")[0]
                    }
                  }
                }
              }
              return ""
            }

            const getSalutation = () => {
              const fields = ["Salutation", "salutation", "SALUTATION"]
              for (const field of fields) {
                if (row[field] && String(row[field]).trim()) return String(row[field]).trim()
              }
              return ""
            }

            const getGuardianType = () => {
              const fields = ["Guardian Type", "guardianType", "GUARDIAN_TYPE"]
              for (const field of fields) {
                if (row[field] && String(row[field]).trim()) return String(row[field]).trim()
              }
              return ""
            }

            const getFatherHusbandName = () => {
              const fields = ["Name of Father-Husband", "Father Name", "fatherName", "FATHER_NAME"]
              for (const field of fields) {
                if (row[field] && String(row[field]).trim()) return String(row[field]).trim()
              }
              return ""
            }

            const getAdhaar = () => {
              const fields = ["Adhaar", "adhaar", "ADHAAR", "Aadhar", "aadhar", "AADHAR"]
              for (const field of fields) {
                if (row[field] && String(row[field]).trim()) return String(row[field]).trim()
              }
              return ""
            }

            const student = {
              salutation: getSalutation(),
              candidate_name: getCandidateName(),
              guardian_type: getGuardianType(),
              name_of_father_husband: getFatherHusbandName(),
              adhaar: getAdhaar(),
              job_role: getJobRole(),
              training_center: row["Training Center"] || row.trainingCenter || row.TRAINING_CENTER || "",
              district: row.District || row.district || row.DISTRICT || "",
              state: row.State || row.state || row.STATE || "",
              assessment_partner:
                row["Assesment Partner"] ||
                row["Assessment Partner"] ||
                row.assessmentPartner ||
                row.ASSESSMENT_PARTNER ||
                "",
              enrollment_number: getEnrollmentNumber(),
              certificate_number: row["Certificate Number"] || row.certificateNumber || row.CERTIFICATE_NUMBER || "",
              date_of_issuance: getDateOfIssuance(),
            }

            console.log(`[v0] Parsed student ${index + 1}:`, student)
            return student
          })

          const validStudents = students.filter((student, index) => {
            const isValid = student.candidate_name && student.enrollment_number && student.job_role && student.date_of_issuance
            if (!isValid) {
              console.log(`[v0] Invalid student at row ${index + 1}:`, {
                candidate_name: !!student.candidate_name,
                enrollment_number: !!student.enrollment_number,
                job_role: !!student.job_role,
                date_of_issuance: !!student.date_of_issuance,
              })
            }
            return isValid
          })

          console.log(`[v0] Valid students: ${validStudents.length} out of ${students.length}`)

          if (validStudents.length === 0) {
            const availableColumns = Object.keys(jsonData[0] || {}).join(", ")
            reject(
              new Error(
                `No valid student records found. Please ensure your Excel file has columns for: Candidate Name, Enrollment Number, Job Role, and Date of Issuance. Available columns: ${availableColumns}`,
              ),
            )
          } else {
            resolve(validStudents)
          }
        } catch (error) {
          console.error("[v0] Excel parsing error:", error)
          reject(new Error("Failed to parse Excel file. Please check the file format."))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      setProgress(25)
      const students = await parseExcelFile(file)

      setProgress(50)
      const response = await fetch("/api/students/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ students }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload students")
      }

      setProgress(100)
      setSuccess(true)
      setShouldRefresh(true)

      setTimeout(() => {
        setFile(null)
        setProgress(0)
        setSuccess(false)
        const input = document.getElementById("excel-file") as HTMLInputElement
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
          <FileSpreadsheet className="h-5 w-5" />
          Upload Students from Excel
        </CardTitle>
        <CardDescription>
          Upload an Excel file (.xlsx, .xls) with student data. Required columns: Candidate Name, Enrollment Number, Job
          Role, Date of Issuance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="excel-file">Excel File</Label>
          <Input id="excel-file" type="file" accept=".xlsx,.xls" onChange={handleFileChange} disabled={isUploading} />
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
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
            <AlertDescription>Students uploaded successfully!</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : "Upload Students"}
        </Button>
        {shouldRefresh && (
          <div className="text-xs text-muted-foreground text-center mt-2">Reload the page to see updates.</div>
        )}
      </CardContent>
    </Card>
  )
}
