"use client"

import { useState } from "react"
import { ChevronDown, Copy, FileText, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ConvertAndStoreResult } from "@/types"

interface ResultsPanelProps {
  results: ConvertAndStoreResult[]
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-emerald-600">
          {results.length} file{results.length > 1 ? "s" : ""} processed successfully
        </span>
      </div>
      <div className="space-y-2">
        {results.map((result, index) => (
          <ResultCard key={result.file_id || index} result={result} index={index} />
        ))}
      </div>
    </div>
  )
}

function ResultCard({ result, index }: { result: ConvertAndStoreResult; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{result.file_name}</p>
            <p className="text-xs text-muted-foreground">
              → {result.md_name}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 px-4 py-3 space-y-2 bg-muted/20">
              <DetailRow label="File ID" value={result.file_id} />
              <DetailRow label="Bill Type" value={result.bill_type} />
              <DetailRow label="Company" value={result.company_name} />
              {result.original_file_id && (
                <DetailRow label="Original File ID" value={result.original_file_id} />
              )}
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
                  }}
                >
                  <Copy className="h-3 w-3 mr-1.5" />
                  Copy JSON
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <code className="text-foreground/80 font-mono truncate">{value}</code>
    </div>
  )
}
