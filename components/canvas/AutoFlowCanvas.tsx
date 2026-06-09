'use client'
import { useCallback, useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { TriggerNode } from './nodes/TriggerNode'
import { ActionNode } from './nodes/ActionNode'
import { ConditionNode } from './nodes/ConditionNode'
import { NodeSidePanel } from './NodeSidePanel'
import { CanvasToolbar } from './CanvasToolbar'
import type { WorkflowJSON, Automation } from '@/types/automation'

const EDGE_STYLE = { stroke: '#7c6fff', strokeWidth: 2 }
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: '#7c6fff' }
// Stable references so ReactFlow doesn't see new objects on every render.
const DEFAULT_EDGE_OPTIONS = { animated: true }

interface AutoFlowCanvasProps {
  workflow: WorkflowJSON
  automation: Automation
  onSave: (workflow: WorkflowJSON) => Promise<boolean>
}

function workflowToNodes(workflow: WorkflowJSON): Node[] {
  const nodes: Node[] = []

  nodes.push({
    id: 'trigger',
    type: 'trigger',
    position: { x: 50, y: 200 },
    data: {
      app: workflow.trigger.app,
      event: workflow.trigger.event,
      description: workflow.trigger.description,
      settings: workflow.trigger.settings,
      config_fields: workflow.trigger.config_fields ?? [],
    },
  })

  workflow.actions.forEach((action, i) => {
    nodes.push({
      id: action.id,
      type: 'action',
      position: action.position ?? { x: 350 + i * 270, y: 200 },
      data: {
        app: action.app,
        action: action.action,
        description: action.description,
        settings: action.settings,
        config_fields: action.config_fields ?? [],
      },
    })
  })

  ;(workflow.conditions ?? []).forEach((cond, i) => {
    nodes.push({
      id: cond.id,
      type: 'condition',
      position: cond.position ?? { x: 350 + i * 270, y: 420 },
      data: {
        field: cond.field,
        operator: cond.operator,
        value: cond.value,
        description: cond.description,
      },
    })
  })

  return nodes
}

function buildEdges(workflow: WorkflowJSON): Edge[] {
  const edges: Edge[] = []
  const allNodes = ['trigger', ...workflow.actions.map(a => a.id)]
  for (let i = 0; i < allNodes.length - 1; i++) {
    edges.push({
      id: `e-${allNodes[i]}-${allNodes[i + 1]}`,
      source: allNodes[i],
      target: allNodes[i + 1],
      animated: true,
      style: EDGE_STYLE,
      markerEnd: EDGE_MARKER,
    })
  }
  return edges
}

function InnerCanvas({ workflow, automation, onSave }: AutoFlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(workflowToNodes(workflow))
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(workflow))
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  // Memoized so ReactFlow never sees a "new" nodeTypes object (avoids warning #002).
  const nodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
  }), [])

  useEffect(() => {
    setNodes(workflowToNodes(workflow))
    setEdges(buildEdges(workflow))
  }, [workflow]) // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, animated: true, style: EDGE_STYLE, markerEnd: EDGE_MARKER }, eds))
  }, [setEdges])

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNode(node)
  }

  function handleNodeUpdate(id: string, data: Record<string, unknown>) {
    setNodes(nds => nds.map(n => (n.id === id ? { ...n, data } : n)))
    if (selectedNode?.id === id) setSelectedNode(prev => (prev ? { ...prev, data } : null))
  }

  // Keep the side panel in sync if its node is deleted from the canvas.
  function handleNodesChange(changes: Parameters<typeof onNodesChange>[0]) {
    onNodesChange(changes)
    const removed = changes.filter(c => c.type === 'remove').map(c => (c as { id: string }).id)
    if (removed.length && selectedNode && removed.includes(selectedNode.id)) {
      setSelectedNode(null)
    }
  }

  /** Find the right-most action/trigger node — the tail of the main flow. */
  function tailNode(): Node | undefined {
    const chain = nodes.filter(n => n.type === 'action' || n.type === 'trigger')
    if (chain.length === 0) return undefined
    return chain.reduce((a, b) => (b.position.x > a.position.x ? b : a))
  }

  function handleAddAction() {
    const id = `action_${Date.now()}`
    const tail = tailNode()
    const x = tail ? tail.position.x + 270 : 350
    const newNode: Node = {
      id,
      type: 'action',
      position: { x, y: 200 },
      data: { app: '', action: '', description: '', settings: {}, config_fields: [] },
    }
    setNodes(nds => [...nds, newNode])
    if (tail) {
      setEdges(eds => [
        ...eds,
        { id: `e-${tail.id}-${id}`, source: tail.id, target: id, animated: true, style: EDGE_STYLE, markerEnd: EDGE_MARKER },
      ])
    }
    setSelectedNode(newNode) // open the panel so the user can configure it
  }

  function handleAddCondition() {
    const id = `condition_${Date.now()}`
    const tail = tailNode()
    const x = tail ? tail.position.x + 270 : 350
    const newNode: Node = {
      id,
      type: 'condition',
      position: { x, y: 420 },
      data: { field: '', operator: '', value: '', description: '' },
    }
    setNodes(nds => [...nds, newNode])
    if (tail) {
      setEdges(eds => [
        ...eds,
        { id: `e-${tail.id}-${id}`, source: tail.id, target: id, animated: true, style: EDGE_STYLE, markerEnd: EDGE_MARKER },
      ])
    }
    setSelectedNode(newNode)
  }

  /** Rebuild the workflow JSON purely from current node state (handles add/delete/reorder). */
  function buildUpdatedWorkflow(): WorkflowJSON {
    const triggerNode = nodes.find(n => n.id === 'trigger')
    const actionNodes = nodes.filter(n => n.type === 'action').sort((a, b) => a.position.x - b.position.x)
    const condNodes = nodes.filter(n => n.type === 'condition').sort((a, b) => a.position.x - b.position.x)

    const t = (triggerNode?.data ?? {}) as Record<string, unknown>

    return {
      ...workflow,
      trigger: {
        app: String(t.app ?? workflow.trigger.app ?? ''),
        event: String(t.event ?? workflow.trigger.event ?? ''),
        description: String(t.description ?? ''),
        settings: (t.settings as Record<string, unknown>) ?? {},
        config_fields: (t.config_fields as string[]) ?? [],
      },
      actions: actionNodes.map(n => {
        const d = n.data as Record<string, unknown>
        return {
          id: n.id,
          app: String(d.app ?? ''),
          action: String(d.action ?? ''),
          description: String(d.description ?? ''),
          settings: (d.settings as Record<string, unknown>) ?? {},
          config_fields: (d.config_fields as string[]) ?? [],
          position: n.position,
        }
      }),
      conditions: condNodes.map(n => {
        const d = n.data as Record<string, unknown>
        return {
          id: n.id,
          field: String(d.field ?? ''),
          operator: String(d.operator ?? ''),
          value: String(d.value ?? ''),
          description: String(d.description ?? ''),
          position: n.position,
        }
      }),
    }
  }

  async function handleSave(): Promise<boolean> {
    return onSave(buildUpdatedWorkflow())
  }

  return (
    <div className="relative w-full h-full bg-bg">
      <CanvasToolbar
        automation={automation}
        workflow={workflow}
        onSave={handleSave}
        onAddAction={handleAddAction}
        onAddCondition={handleAddCondition}
      />

      <div className="absolute inset-0 top-14">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        >
          <Background variant={BackgroundVariant.Dots} color="#2a2a3a" gap={24} />
          <Controls className="!bg-surface !border-border" />
          <MiniMap
            nodeColor={n => (n.type === 'trigger' ? '#22c55e' : n.type === 'condition' ? '#f59e0b' : '#7c6fff')}
            className="!bg-surface !border-border"
          />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="absolute right-0 top-14 bottom-0 z-20">
          <NodeSidePanel
            node={selectedNode as { id: string; type: string; data: Record<string, unknown> }}
            onClose={() => setSelectedNode(null)}
            onUpdate={handleNodeUpdate}
          />
        </div>
      )}
    </div>
  )
}

export function AutoFlowCanvas(props: AutoFlowCanvasProps) {
  // Provider is required so custom nodes can call useReactFlow() (for delete buttons).
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} />
    </ReactFlowProvider>
  )
}
