import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'active' | 'paused' | 'running' | 'error' | 'default'
  children: React.ReactNode
  className?: string
}

const variants = {
  active: 'bg-success/20 text-success border-success/30',
  paused: 'bg-muted/20 text-muted border-muted/30',
  running: 'bg-accent/20 text-accent-light border-accent/30',
  error: 'bg-danger/20 text-danger border-danger/30',
  default: 'bg-surface-2 text-muted border-border',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border',
      variants[variant],
      className
    )}>
      {variant === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
      )}
      {variant === 'active' && (
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
      )}
      {children}
    </span>
  )
}
