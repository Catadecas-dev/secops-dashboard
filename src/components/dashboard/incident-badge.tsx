import { Badge } from '@/components/ui/badge'
import { Severity, Status } from '@prisma/client'
import { cn } from '@/lib/utils'

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const severityConfig = {
    LOW: { label: 'Low', className: 'severity-low' },
    MEDIUM: { label: 'Medium', className: 'severity-medium' },
    HIGH: { label: 'High', className: 'severity-high' },
    CRITICAL: { label: 'Critical', className: 'severity-critical' },
  }

  const config = severityConfig[severity]

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    OPEN: { label: 'Open', className: 'status-open' },
    IN_PROGRESS: { label: 'In Progress', className: 'status-in-progress' },
    RESOLVED: { label: 'Resolved', className: 'status-resolved' },
    CLOSED: { label: 'Closed', className: 'status-closed' },
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
