import { Handle, Position, type NodeProps } from 'reactflow'
import { getAppIcon } from '@/lib/utils'

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div className={`
      bg-surface border-2 rounded-xl p-4 min-w-[200px] cursor-pointer transition-all
      ${selected ? 'border-success shadow-lg shadow-success/20' : 'border-success/40 hover:border-success/70'}
    `}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{getAppIcon(data.app)}</span>
        <div>
          <p className="text-xs font-medium text-success uppercase tracking-wider">Trigger</p>
          <p className="text-sm font-semibold text-white">{data.app}</p>
        </div>
      </div>
      <p className="text-xs text-muted">{data.event}</p>
      {data.description && (
        <p className="text-xs text-muted/70 mt-1 border-t border-border/50 pt-1">{data.description}</p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-success !border-success/50 !w-3 !h-3" />
    </div>
  )
}
