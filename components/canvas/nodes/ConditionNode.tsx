import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow'
import { X } from 'lucide-react'

export function ConditionNode({ id, data, selected }: NodeProps) {
  const { deleteElements } = useReactFlow()

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteElements({ nodes: [{ id }] })
  }

  return (
    <div className={`
      group relative bg-surface border-2 rounded-xl p-4 min-w-[200px] cursor-pointer transition-all
      ${selected ? 'border-warning shadow-lg shadow-warning/20' : 'border-warning/40 hover:border-warning/70'}
    `}>
      <Handle type="target" position={Position.Left} className="!bg-warning !border-warning/50 !w-3 !h-3" />

      {/* Delete button — appears on hover/selection */}
      <button
        onClick={handleDelete}
        title="Delete this condition"
        className={`
          absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center
          shadow-lg transition-opacity hover:bg-red-600 z-10
          ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔀</span>
        <div>
          <p className="text-xs font-medium text-warning uppercase tracking-wider">Condition</p>
          <p className="text-sm font-semibold text-white">{data.field || 'Check condition'}</p>
        </div>
      </div>
      <p className="text-xs text-muted">
        {data.description || (data.field ? `If ${data.field} ${data.operator || ''} ${data.value || ''}` : 'Click to configure')}
      </p>
      <Handle type="source" position={Position.Right} id="true" style={{ top: '35%' }} className="!bg-success !border-success/50 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '65%' }} className="!bg-danger !border-danger/50 !w-3 !h-3" />
    </div>
  )
}
