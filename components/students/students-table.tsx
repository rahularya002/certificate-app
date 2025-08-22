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
  name: string
  roll_number: string
  course: string
  completion_date: string
  email?: string
  phone?: string
  grade?: string
  created_at: string
}

interface StudentsTableProps {
  students: Student[]
  onRefresh: () => void
}

export function StudentsTable({ students, onRefresh }: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.course.toLowerCase().includes(searchTerm.toLowerCase()),
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

      onRefresh()
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
              <TableHead>Name</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Completion Date</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Contact</TableHead>
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
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.roll_number}</TableCell>
                  <TableCell>{student.course}</TableCell>
                  <TableCell>{new Date(student.completion_date).toLocaleDateString()}</TableCell>
                  <TableCell>{student.grade && <Badge variant="outline">{student.grade}</Badge>}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {student.email && <div>{student.email}</div>}
                      {student.phone && <div className="text-muted-foreground">{student.phone}</div>}
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
