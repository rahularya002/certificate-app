import "./globals.css"
import type React from "react"
import { PerformanceMonitor } from "@/components/ui/performance-monitor"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <PerformanceMonitor />
      </body>
    </html>
  )
}
