"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Server, FileCheck, Database, Link as LinkIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AnimatedContainer } from "@/components/shared/animated-container"
import { SUPPORTED_FORMATS } from "@/lib/constants"
import { api } from "@/lib/api"
import type { ApiInfo } from "@/types"

const API_ENDPOINTS = [
  { method: "GET", path: "/api/files", desc: "List source files" },
  { method: "GET", path: "/api/results", desc: "List converted markdown files" },
  { method: "POST", path: "/api/upload", desc: "Upload files (multipart)" },
  { method: "GET", path: "/api/download/:filename", desc: "Download markdown file" },
  { method: "POST", path: "/api/convert", desc: "Async conversion" },
  { method: "POST", path: "/api/convert-upload", desc: "Upload + convert synchronously" },
  { method: "GET", path: "/api/status/:taskId", desc: "Check task status" },
  { method: "GET", path: "/api/tasks", desc: "List all tasks" },
  { method: "POST", path: "/api/convert-and-store", desc: "Convert & store to Appwrite" },
  { method: "GET", path: "/api/query-rules", desc: "Query rules by type & company" },
  { method: "GET", path: "/api/documents", desc: "List Appwrite documents" },
  { method: "POST", path: "/api/documents/upload", desc: "Upload to Appwrite" },
  { method: "GET", path: "/api/documents/:id", desc: "Download from Appwrite" },
  { method: "DELETE", path: "/api/documents/:id", desc: "Delete from Appwrite" },
]

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  POST: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
}

export default function InfoPage() {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null)

  useEffect(() => {
    api.getApiInfo().then((r) => setApiInfo(r.data || null)).catch(() => {})
  }, [])

  return (
    <AnimatedContainer className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">API Info</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration and available API endpoints
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConfigRow label="Service" value={apiInfo?.service || "MinerU Document Converter"} />
              <Separator />
              <ConfigRow
                label="Backend URL"
                value={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}`}
              />
              <Separator />
              <ConfigRow
                label="Frontend"
                value="Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui"
              />
              <Separator />
              <ConfigRow label="MinerU Token" value="Configured via .env" />
              <Separator />
              <ConfigRow label="Storage" value="Appwrite + Local filesystem" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Supported Formats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Supported Formats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(SUPPORTED_FORMATS.map((f) => f.label))).map((label) => {
                  const exts = SUPPORTED_FORMATS.filter((f) => f.label === label).map(
                    (f) => f.ext
                  )
                  return (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="gap-1.5 px-3 py-1.5"
                    >
                      <span className="text-xs font-medium">{label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({exts.join(", ")})
                      </span>
                    </Badge>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* API Endpoints */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card border-border/40">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              API Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/30">
              {API_ENDPOINTS.map((ep, index) => (
                <motion.div
                  key={`${ep.method}-${ep.path}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.02 }}
                  className="flex items-center gap-3 py-2.5"
                >
                  <Badge
                    variant="outline"
                    className={`shrink-0 w-14 justify-center font-mono text-[10px] font-bold ${
                      methodColors[ep.method] || ""
                    }`}
                  >
                    {ep.method}
                  </Badge>
                  <code className="text-sm font-medium text-foreground/80 shrink-0">
                    {ep.path}
                  </code>
                  <span className="text-xs text-muted-foreground truncate ml-auto">
                    {ep.desc}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatedContainer>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  )
}
