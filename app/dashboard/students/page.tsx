"use client"

import { Header } from "@/components/dashboard/header"
import { FileUpload } from "@/components/students/file-upload"
import { StudentsTable } from "@/components/students/students-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchStudents = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/students?page=${page}&limit=100`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setStudents(data.students || [])
      setPagination(data.pagination)
      
      // Clear selections when page changes
      setSelectedStudents([])

    } catch (err) {
      console.error("Exception in fetchStudents:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents(1)
  }, [])

  // Get recently added students (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const recentStudents = students?.filter(student => 
    new Date(student.created_at) > sevenDaysAgo
  ) || []

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map(student => student.id))
    } else {
      setSelectedStudents([])
    }
  }

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId])
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedStudents.length} student(s)?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedStudents })
      })

      if (!response.ok) {
        throw new Error('Failed to delete students')
      }

      // Refresh current page
      await fetchStudents(pagination.page)
      setSelectedStudents([])
    } catch (error) {
      console.error('Error deleting students:', error)
      alert('Failed to delete students')
    } finally {
      setIsDeleting(false)
    }
  }

  const isAllSelected = students.length > 0 && selectedStudents.length === students.length
  const isIndeterminate = selectedStudents.length > 0 && selectedStudents.length < students.length

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title="Students"
          description="Manage student records and upload data from Excel files"
        />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Students"
        description="Manage student records and upload data from Excel files"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <FileUpload />

          {/* All Students Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">All Students</h2>
                <Badge variant="outline">{pagination.total} total</Badge>
                <Badge variant="secondary">Page {pagination.page} of {pagination.totalPages}</Badge>
              </div>
              
              {/* Bulk Actions */}
              {selectedStudents.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedStudents.length} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete Selected"}
                  </Button>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStudents(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStudents(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            <StudentsTable 
              students={students || []} 
              selectedStudents={selectedStudents}
              onSelectAll={handleSelectAll}
              onSelectStudent={handleSelectStudent}
              isAllSelected={isAllSelected}
              isIndeterminate={isIndeterminate}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
