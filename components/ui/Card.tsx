import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ children, className, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl p-5',
        hover && 'hover:border-accent/40 hover:bg-surface-2 transition-all cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
