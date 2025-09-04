"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Users, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

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

const ITEMS_PER_PAGE = 100

export function StudentSelector({ students, selectedStudents, onSelectionChange }: StudentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Normalize students input in case caller passes an API payload like { students: [...] }
  const allStudents: Student[] = Array.isArray(students)
    ? students
    : ((students as unknown as { students?: Student[] })?.students ?? [])

  const filteredStudents = allStudents.filter((student) => {
    const matchesSearch =
      student.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = !courseFilter || student.job_role === courseFilter

    return matchesSearch && matchesCourse
  })

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentPageStudents = filteredStudents.slice(startIndex, endIndex)

  const uniqueCourses = Array.from(new Set(allStudents.map((s) => s.job_role)))

  const handleStudentToggle = (student: Student, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedStudents, student])
    } else {
      onSelectionChange(selectedStudents.filter((s) => s.id !== student.id))
    }
  }

  const handleSelectAllCurrentPage = () => {
    const newSelected = [...selectedStudents]
    currentPageStudents.forEach((student) => {
      if (!newSelected.some((s) => s.id === student.id)) {
        newSelected.push(student)
      }
    })
    onSelectionChange(newSelected)
  }

  const handleClearAllCurrentPage = () => {
    const newSelected = selectedStudents.filter(
      (student) => !currentPageStudents.some((s) => s.id === student.id)
    )
    onSelectionChange(newSelected)
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const selectedOnCurrentPage = currentPageStudents.filter((student) =>
    selectedStudents.some((s) => s.id === student.id)
  ).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Students
        </CardTitle>
        <CardDescription>
          Choose students to generate certificates for (100 per page)
        </CardDescription>
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

        {/* Pagination Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
          </span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>

        {/* Selection Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAllCurrentPage}>
              Select All on Page ({currentPageStudents.length})
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAllCurrentPage}>
              Clear Page ({selectedOnCurrentPage})
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Clear All ({selectedStudents.length})
            </Button>
          </div>
          <Badge variant="secondary">{selectedStudents.length} total selected</Badge>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Selected Students Summary */}
        {selectedStudents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Students ({selectedStudents.length}):</h4>
            <div className="max-h-20 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {selectedStudents.slice(0, 10).map((student) => (
                  <Badge key={student.id} variant="default" className="flex items-center gap-1">
                    {student.candidate_name}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleStudentToggle(student, false)} />
                  </Badge>
                ))}
                {selectedStudents.length > 10 && (
                  <Badge variant="secondary">+{selectedStudents.length - 10} more</Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {currentPageStudents.map((student) => {
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

        {currentPageStudents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No students found on this page</div>
        )}
      </CardContent>
    </Card>
  )
}
