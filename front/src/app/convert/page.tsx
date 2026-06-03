"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Zap, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedContainer } from "@/components/shared/animated-container"
import { StatusBadge } from "@/components/shared/status-badge"
import { FileDropzone } from "@/components/convert/file-dropzone"
import { ResultsPanel } from "@/components/convert/results-panel"
import { api, ApiError } from "@/lib/api"
import type { ConvertAndStoreResult } from "@/types"

function parseError(err: unknown): { message: string; isConnection: boolean; isTimeout: boolean } {
  if (err instanceof ApiError) {
    if (err.detail === "connection") {
      return {
        message: `无法连接到后端 — 请确认 Flask 已在端口 5000 启动`,
        isConnection: true,
        isTimeout: false,
      }
    }
    if (err.detail === "timeout") {
      return {
        message: `请求超时 — 转换耗时过长，请尝试减少文件数量`,
        isConnection: false,
        isTimeout: true,
      }
    }
    return { message: err.message, isConnection: false, isTimeout: false }
  }
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return {
      message: `无法连接到后端 — 请确认 Flask 已在端口 5000 启动`,
      isConnection: true,
      isTimeout: false,
    }
  }
  return {
    message: err instanceof Error ? err.message : "处理失败",
    isConnection: false,
    isTimeout: false,
  }
}

export default function ConvertPage() {
  const [files, setFiles] = useState<File[]>([])
  const [billType, setBillType] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ConvertAndStoreResult[] | null>(null)
  const [error, setError] = useState<{ message: string; isConnection: boolean; isTimeout: boolean } | null>(null)

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error("请先选择文件")
      return
    }
    if (!billType.trim()) {
      toast.error("请输入规则类型")
      return
    }
    if (!companyName.trim()) {
      toast.error("请输入公司名称")
      return
    }

    setProcessing(true)
    setError(null)
    setResults(null)

    try {
      const formData = new FormData()
      files.forEach((f) => formData.append("files", f))
      formData.append("billType", billType.trim())
      formData.append("companyName", companyName.trim())

      const response = await api.convertAndStore(formData)
      const data = response.data || []
      setResults(data)
      if (data.length === 0) {
        setError({
          message: `0 个文件被成功处理。请检查控制台中 Flask 的输出日志。可能原因：MinerU Token 未配置或无效、文件格式不兼容`,
          isConnection: false,
          isTimeout: false,
        })
        toast.warning("0 个文件被处理")
      } else {
        toast.success(`成功处理 ${data.length} 个文件`)
      }
    } catch (err) {
      const parsed = parseError(err)
      setError(parsed)
      toast.error(parsed.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AnimatedContainer className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Rule Convert & Store</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents, convert them to markdown via MinerU, and store in Appwrite
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Controls */}
        <motion.div
          className="lg:col-span-2 space-y-5"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {/* Upload Card */}
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs">
                  1
                </span>
                Upload Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileDropzone
                files={files}
                onFilesChange={setFiles}
                disabled={processing}
              />
            </CardContent>
          </Card>

          {/* Config Card */}
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs">
                  2
                </span>
                Configure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billType">Rule Type</Label>
                <Input
                  id="billType"
                  placeholder="e.g. 发票, 收据, 合同"
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                  disabled={processing}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g. 某某科技有限公司"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={processing}
                  className="h-10"
                />
              </div>
              <Button
                className="w-full h-11 gradient-btn font-semibold"
                onClick={handleProcess}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Processing
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Results */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <Card className="glass-card border-border/40 min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Results</span>
                {processing && (
                  <StatusBadge type="loading" label="Processing..." />
                )}
                {results && !error && (
                  <StatusBadge type="success" label={`${results.length} file(s)`} />
                )}
                {error && (
                  <StatusBadge type="error" label="Failed" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!results && !error && !processing && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                    <Zap className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload files and configure settings, then click Start Processing
                  </p>
                </div>
              )}

              {processing && (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-shimmer rounded-lg h-14" />
                  ))}
                  <p className="text-xs text-center text-muted-foreground pt-3">
                    Converting and uploading files, this may take a moment...
                  </p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-3 py-6 px-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${error.isConnection ? "bg-amber-500/10" : error.isTimeout ? "bg-orange-500/10" : "bg-red-500/10"}`}>
                    <AlertCircle className={`h-6 w-6 ${error.isConnection ? "text-amber-500" : error.isTimeout ? "text-orange-500" : "text-red-500"}`} />
                  </div>
                  <p className="text-sm text-center whitespace-pre-wrap max-w-md">
                    {error.message}
                  </p>
                  {error.isConnection && (
                    <div className="text-xs text-muted-foreground text-center mt-1 space-y-1">
                      <p>排查步骤：</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>确认 Flask 后端正在运行（端口 5000）</li>
                        <li>检查终端中是否有报错信息</li>
                        <li>确认 .env 中 MinerU Token 已配置</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {results && !error && <ResultsPanel results={results} />}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatedContainer>
  )
}
