"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, AlertTriangle } from "lucide-react"

interface PerformanceMetrics {
  apiCall: string
  duration: number
  timestamp: Date
  success: boolean
  error?: string
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show monitor after 3 API calls
    if (metrics.length >= 3) {
      setIsVisible(true)
    }
  }, [metrics.length])

  const addMetric = (metric: PerformanceMetrics) => {
    setMetrics(prev => [...prev.slice(-9), metric]) // Keep last 10 metrics
  }

  const getAverageResponseTime = () => {
    if (metrics.length === 0) return 0
    const total = metrics.reduce((sum, m) => sum + m.duration, 0)
    return Math.round(total / metrics.length)
  }

  const getSuccessRate = () => {
    if (metrics.length === 0) return 100
    const successful = metrics.filter(m => m.success).length
    return Math.round((successful / metrics.length) * 100)
  }

  if (!isVisible) return null

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-background/95 backdrop-blur-sm border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Performance Monitor
          <Badge variant="secondary" className="text-xs">
            {metrics.length} calls
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Avg Response:</span>
          <span className="font-mono">{getAverageResponseTime()}ms</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Success Rate:</span>
          <span className="font-mono">{getSuccessRate()}%</span>
        </div>
        
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {metrics.slice(-5).reverse().map((metric, index) => (
            <div key={index} className="flex items-center justify-between text-xs p-1 rounded bg-muted/50">
              <span className="truncate flex-1">{metric.apiCall}</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{metric.duration}ms</span>
                {!metric.success && <AlertTriangle className="h-3 w-3 text-destructive" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Hook to track API performance
export function usePerformanceTracking() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])

  const trackApiCall = async <T>(
    apiCall: string,
    promise: Promise<T>
  ): Promise<T> => {
    const startTime = Date.now()
    
    try {
      const result = await promise
      const duration = Date.now() - startTime
      
      setMetrics(prev => [...prev.slice(-9), {
        apiCall,
        duration,
        timestamp: new Date(),
        success: true
      }])
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      setMetrics(prev => [...prev.slice(-9), {
        apiCall,
        duration,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }])
      
      throw error
    }
  }

  return { trackApiCall, metrics }
}
