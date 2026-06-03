"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, FileText, Eye, AlertCircle, FolderSearch, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnimatedContainer } from "@/components/shared/animated-container"
import { StatusBadge } from "@/components/shared/status-badge"
import { CopyButton } from "@/components/shared/copy-button"
import { MarkdownViewer } from "@/components/query/markdown-viewer"
import { api } from "@/lib/api"
import type { QueryRuleResult } from "@/types"

export default function QueryPage() {
  const [billType, setBillType] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<QueryRuleResult[]>([])
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [selectedContent, setSelectedContent] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!billType.trim()) {
      toast.error("Please enter rule type")
      return
    }
    if (!companyName.trim()) {
      toast.error("Please enter company name")
      return
    }

    setSearching(true)
    setError(null)
    setSelectedFile("")
    setSelectedContent("")
    setSearched(true)

    try {
      const response = await api.queryRules(billType.trim(), companyName.trim())
      const data = response.data || []
      setResults(data)
      if (data.length === 0) {
        setError("No records found")
      } else {
        setSelectedFile(data[0].filename)
        setSelectedContent(data[0].content)
      }
      toast.success(`Found ${data.length} record(s)`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed"
      setError(message)
      setResults([])
      toast.error(message)
    } finally {
      setSearching(false)
    }
  }

  const handleFileSelect = (filename: string | null) => {
    if (!filename) return
    setSelectedFile(filename)
    const match = results.find((r) => r.filename === filename)
    setSelectedContent(match?.content || "")
  }

  return (
    <AnimatedContainer className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Rule Query</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search stored rules by type and company, then preview markdown content
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Search */}
        <motion.div
          className="lg:col-span-2 space-y-5"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Search Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query-billType">Rule Type</Label>
                <Input
                  id="query-billType"
                  placeholder="e.g. 发票"
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                  disabled={searching}
                  className="h-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="query-companyName">Company Name</Label>
                <Input
                  id="query-companyName"
                  placeholder="e.g. 某某科技有限公司"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={searching}
                  className="h-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                className="w-full h-11 gradient-btn font-semibold"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>

              {/* Matching Files — shown below search controls */}
              {results.length > 0 && (
                <motion.div
                  className="pt-3 border-t border-border/40"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Matching Files</span>
                    <StatusBadge
                      type="success"
                      label={`${results.length} result${results.length > 1 ? "s" : ""}`}
                    />
                  </div>
                  <ScrollArea className="max-h-[180px] rounded-lg border border-border/40">
                    <div className="space-y-0.5 p-1">
                      {results.map((r) => {
                        const isActive = selectedFile === r.filename
                        return (
                          <button
                            key={r.filename}
                            type="button"
                            onClick={() => handleFileSelect(r.filename)}
                            className={[
                              "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground hover:bg-muted/60",
                            ].join(" ")}
                          >
                            <FileText className={[
                              "h-3.5 w-3.5 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground",
                            ].join(" ")} />
                            <span className="truncate flex-1">{r.filename}</span>
                            {isActive && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Preview */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <Card className="glass-card border-border/40 min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Content Preview
                </span>
                {selectedContent && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">
                      {selectedFile}
                    </span>
                    <CopyButton text={selectedContent} />
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!searched && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <FolderSearch className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter rule type and company name, then click Search
                  </p>
                </div>
              )}

              {searching && (
                <div className="space-y-3 py-8">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-shimmer rounded-lg h-20" />
                  ))}
                </div>
              )}

              {searched && error && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              )}

              {selectedContent && !searching && (
                <MarkdownViewer content={selectedContent} className="min-h-[300px]" />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatedContainer>
  )
}
