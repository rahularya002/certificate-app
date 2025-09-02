import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BatchProgressProps {
  currentBatch: number
  totalBatches: number
  currentStudent: number
  totalStudents: number
  isProcessing: boolean
}

export function BatchProgress({
  currentBatch,
  totalBatches,
  currentStudent,
  totalStudents,
  isProcessing
}: BatchProgressProps) {
  const batchProgress = (currentBatch / totalBatches) * 100
  const studentProgress = (currentStudent / totalStudents) * 100
  const overallProgress = ((currentBatch - 1) * 100 / totalBatches) + (studentProgress / totalBatches)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Processing Certificates...
            </>
          ) : (
            "Certificate Generation Progress"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="w-full" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Batch Progress</span>
            <span>Batch {currentBatch} of {totalBatches}</span>
          </div>
          <Progress value={batchProgress} className="w-full" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Current Batch</span>
            <span>Student {currentStudent} of {totalStudents}</span>
          </div>
          <Progress value={studentProgress} className="w-full" />
        </div>
        
        <div className="text-xs text-muted-foreground">
          Processing in batches of 10 to avoid timeouts...
        </div>
      </CardContent>
    </Card>
  )
}
