import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow'
import { X } from 'lucide-react'
import { getAppIcon } from '@/lib/utils'

export function ActionNode({ id, data, selected }: NodeProps) {
  const { deleteElements } = useReactFlow()

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    // deleteElements also removes any edges connected to this node.
    deleteElements({ nodes: [{ id }] })
  }

  return (
    <div className={`
      group relative bg-surface border-2 rounded-xl p-4 min-w-[200px] cursor-pointer transition-all
      ${selected ? 'border-accent shadow-lg shadow-accent/20' : 'border-accent/40 hover:border-accent/70'}
    `}>
      <Handle type="target" position={Position.Left} className="!bg-accent !border-accent/50 !w-3 !h-3" />

      {/* Delete button — appears on hover/selection */}
      <button
        onClick={handleDelete}
        title="Delete this step"
        className={`
          absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center
          shadow-lg transition-opacity hover:bg-red-600 z-10
          ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{getAppIcon(data.app)}</span>
        <div>
          <p className="text-xs font-medium text-accent-light uppercase tracking-wider">Action</p>
          <p className="text-sm font-semibold text-white">{data.app || 'New step'}</p>
        </div>
      </div>
      <p className="text-xs text-muted">{data.action || 'Click to configure'}</p>
      {data.description && (
        <p className="text-xs text-muted/70 mt-1 border-t border-border/50 pt-1">{data.description}</p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-accent !border-accent/50 !w-3 !h-3" />
    </div>
  )
}
