import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, AlertCircle, Info } from "lucide-react"

type StatusType = "success" | "error" | "loading" | "warning" | "info"

const statusConfig: Record<
  StatusType,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  success: { icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  error: { icon: XCircle, className: "bg-red-500/10 text-red-600 border-red-500/20" },
  loading: { icon: Loader2, className: "bg-primary/10 text-primary border-primary/20" },
  warning: { icon: AlertCircle, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  info: { icon: Info, className: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
}

interface StatusBadgeProps {
  type: StatusType
  label: string
  className?: string
}

export function StatusBadge({ type, label, className }: StatusBadgeProps) {
  const config = statusConfig[type]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2.5 py-1 font-medium",
        config.className,
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", type === "loading" && "animate-spin")} />
      {label}
    </Badge>
  )
}
