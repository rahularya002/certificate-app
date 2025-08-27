"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Users, X } from "lucide-react"

interface Student {
  id: string
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
  created_at: string
}

interface StudentSelectorProps {
  students: Student[]
  selectedStudents: Student[]
  onSelectionChange: (students: Student[]) => void
}

export function StudentSelector({ students, selectedStudents, onSelectionChange }: StudentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [courseFilter, setCourseFilter] = useState("")

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = !courseFilter || student.job_role === courseFilter

    return matchesSearch && matchesCourse
  })

  const uniqueCourses = Array.from(new Set(students.map((s) => s.job_role)))

  const handleStudentToggle = (student: Student, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedStudents, student])
    } else {
      onSelectionChange(selectedStudents.filter((s) => s.id !== student.id))
    }
  }

  const handleSelectAll = () => {
    onSelectionChange(filteredStudents)
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Students
        </CardTitle>
        <CardDescription>Choose students to generate certificates for</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">All Courses</option>
            {uniqueCourses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>

        {/* Selection Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All ({filteredStudents.length})
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
          <Badge variant="secondary">{selectedStudents.length} selected</Badge>
        </div>

        {/* Selected Students */}
        {selectedStudents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Students:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedStudents.map((student) => (
                <Badge key={student.id} variant="default" className="flex items-center gap-1">
                  {student.candidate_name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleStudentToggle(student, false)} />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Student List */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredStudents.map((student) => {
            const isSelected = selectedStudents.some((s) => s.id === student.id)
            return (
              <div key={student.id} className="flex items-center space-x-3 p-2 rounded-lg border">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleStudentToggle(student, checked as boolean)}
                />
                <div className="flex-1">
                  <div className="font-medium">{student.candidate_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {student.enrollment_number} • {student.job_role}
                    {student.training_center && ` • ${student.training_center}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No students found</div>
        )}
      </CardContent>
    </Card>
  )
}
