import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm text-muted font-medium">{label}</label>}
      <input
        className={cn(
          'w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white',
          'placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
          'transition-colors',
          error && 'border-danger/60',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
