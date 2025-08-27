"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, Edit, Trash2 } from "lucide-react"

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

interface StudentsTableProps {
  students: Student[]
}

export function StudentsTable({ students }: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredStudents = students.filter(
    (student) =>
      student.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.job_role.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDelete = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return

    setIsDeleting(studentId)
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete student")
      }

      window.location.reload()
    } catch (error) {
      console.error("Error deleting student:", error)
      alert("Failed to delete student")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">{filteredStudents.length} students</Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate Name</TableHead>
              <TableHead>Enrollment Number</TableHead>
              <TableHead>Job Role</TableHead>
              <TableHead>Date of Issuance</TableHead>
              <TableHead>Training Center</TableHead>
              <TableHead>District/State</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.candidate_name}</TableCell>
                  <TableCell>{student.enrollment_number}</TableCell>
                  <TableCell>{student.job_role}</TableCell>
                  <TableCell>{new Date(student.date_of_issuance).toLocaleDateString()}</TableCell>
                  <TableCell>{student.training_center && <Badge variant="outline">{student.training_center}</Badge>}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {student.district && <div>{student.district}</div>}
                      {student.state && <div className="text-muted-foreground">{student.state}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(student.id)}
                          disabled={isDeleting === student.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isDeleting === student.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
