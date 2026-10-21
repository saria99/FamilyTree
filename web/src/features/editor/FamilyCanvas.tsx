import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { addClaim, type CommandResult } from '../../data/commands'
import { checkMarriage, checkParentage, violations, type RuleOutcome } from '../../domain/rules'
import { personName } from '../../domain/text'
import { StatusLegend } from '../../shared/status'
import { computeLayout, marriageIdOf, type Layout } from '../layout/layout'
import { ConfirmDialog, MarriageDialog } from './forms'
import { edgeTypes, nodeTypes, type DropVerdict, type StatusFlowEdge } from './nodes'
import type { Selection } from './SidePanel'

interface Props {
  editable: boolean
  selection?: Selection
  onSelect?: (s: Selection) => void
  onOpenProfile?: (personId: string) => void
  branchId?: string
  focusId?: string
  meId?: string
}

export function FamilyCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

type DropTarget = { draggedId: string; targetId: string; verdict: DropVerdict; outcome: RuleOutcome }

function CanvasInner({ editable, selection, onSelect, onOpenProfile, branchId, focusId, meId }: Props) {
  const { t, lang } = useLang()
  const data = useTreeData()
  const g = useGraph()
  const { run } = useStoreApi()
  const flow = useReactFlow()
  const [layout, setLayout] = useState<Layout | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [drop, setDrop] = useState<DropTarget | null>(null)
  const [marriageDraft, setMarriageDraft] = useState<{ husbandId: string; wifeId: string } | null>(null)
  const [alternative, setAlternative] = useState<{ childId: string; marriageId: string } | null>(null)
  const fitted = useRef(false)

  const visible = useMemo(() => {
    const branch = data.branches.find((b) => b.id === branchId)
    return branch ? g.branchMembers(branch) : undefined
  }, [g, data.branches, branchId])

  useEffect(() => {
    let cancelled = false
    computeLayout(g, { visible, rtl: lang === 'ar' }).then((l) => {
      if (!cancelled) setLayout(l)
    })
    return () => {
      cancelled = true
    }
  }, [g, visible, lang])

  const baseNodes = useMemo<Node[]>(() => {
    if (!layout) return []
    // The layout is computed asynchronously; skip anything removed since (e.g. right after Undo).
    const exists = (n: { id: string; kind: string }) => (n.kind === 'person' ? g.persons.has(n.id) : g.marriages.has(marriageIdOf(n.id)!))
    return layout.nodes.filter(exists).map((n) => {
      if (n.kind === 'person') {
        return {
          id: n.id,
          type: 'person',
          position: { x: n.x, y: n.y },
          draggable: editable,
          selected: selection?.kind === 'person' && selection.id === n.id,
          data: { person: g.person(n.id)!, lang, verdict: null, isMe: n.id === meId, dimmed: false },
        }
      }
      const marriage = g.marriages.get(marriageIdOf(n.id)!)!
      return {
        id: n.id,
        type: 'union',
        position: { x: n.x, y: n.y },
        draggable: false,
        selected: selection?.kind === 'marriage' && selection.id === marriage.id,
        data: { marriage, verdict: null, dimmed: false },
      }
    })
  }, [layout, g, lang, editable, selection, meId])

  useEffect(() => setNodes(baseNodes), [baseNodes, setNodes])

  useEffect(() => {
    if (!layout || layout.nodes.length === 0) return
    if (focusId && layout.nodes.some((n) => n.id === focusId)) {
      const n = layout.nodes.find((x) => x.id === focusId)!
      void flow.setCenter(n.x + 86, n.y + 33, { zoom: 1, duration: 300 })
    } else if (!fitted.current) {
      fitted.current = true
      requestAnimationFrame(() => void flow.fitView({ padding: 0.15 }))
    }
  }, [layout, focusId, flow])

  const edges = useMemo<StatusFlowEdge[]>(() => {
    if (!layout) return []
    const ids = new Set(baseNodes.map((n) => n.id))
    return layout.edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'status',
      selected: (e.kind === 'child' || e.kind === 'alternative') && selection?.kind === 'claim' && selection.id === e.claimId,
      data: {
        kind: e.kind,
        status: e.status,
        confidence: e.confidence,
        claimId: 'claimId' in e ? e.claimId : undefined,
        label: e.kind === 'kinship' ? t(e.linkKind === 'Guardianship' ? 'person.guardian' : e.linkKind === 'MilkMother' ? 'person.milkMother' : 'person.milkFather') : undefined,
      },
    }))
  }, [layout, baseNodes, selection, t])

  const evaluate = useCallback(
    (draggedId: string, targetId: string): DropTarget | null => {
      const dragged = g.person(draggedId)
      if (!dragged) return null
      const marriageId = marriageIdOf(targetId)
      let outcome: RuleOutcome
      if (marriageId) {
        const hasPreferred = !!g.preferredClaim(draggedId)
        outcome = checkParentage(data, { childId: draggedId, marriageId, preferred: !hasPreferred, status: hasPreferred ? 'Disputed' : 'Unconfirmed' }, lang)
        const verdict: DropVerdict = violations(outcome).length ? 'bad' : outcome.results.length || hasPreferred ? 'warn' : 'ok'
        return { draggedId, targetId, verdict, outcome }
      }
      const target = g.person(targetId)
      if (!target) return null
      const [husbandId, wifeId] = dragged.gender === 'M' ? [dragged.id, target.id] : [target.id, dragged.id]
      outcome = checkMarriage(data, { husbandId, wifeId, endReason: 'Ongoing', status: 'Unconfirmed', confidence: 'Low' }, lang)
      const verdict: DropVerdict = violations(outcome).length ? 'bad' : outcome.results.length ? 'warn' : 'ok'
      return { draggedId, targetId, verdict, outcome }
    },
    [g, data, lang],
  )

  const findTarget = useCallback(
    (node: Node) => {
      const hits = flow.getIntersectingNodes(node).filter((n) => n.id !== node.id)
      return hits.find((n) => n.type === 'union') ?? hits.find((n) => n.type === 'person')
    },
    [flow],
  )

  const onNodeDrag: OnNodeDrag = useCallback(
    (_, node) => {
      const target = findTarget(node)
      setDrop(target ? evaluate(node.id, target.id) : null)
    },
    [findTarget, evaluate],
  )

  const onNodeDragStop: OnNodeDrag = useCallback(
    async (_, node) => {
      const target = findTarget(node)
      const result = target ? evaluate(node.id, target.id) : null
      setDrop(null)
      setNodes(baseNodes)
      if (!result) return
      if (result.verdict === 'bad') {
        await run('', (): CommandResult => ({ ok: false, outcome: { results: violations(result.outcome) } }))
        return
      }
      const marriageId = marriageIdOf(result.targetId)
      if (marriageId) {
        if (g.preferredClaim(result.draggedId)) {
          setAlternative({ childId: result.draggedId, marriageId })
          return
        }
        const id = await run('Add child', (ack) => addClaim(data, { childId: result.draggedId, marriageId, preferred: true, status: 'Unconfirmed', confidence: 'Low' }, ack))
        if (id) onSelect?.({ kind: 'claim', id })
        return
      }
      const dragged = g.person(result.draggedId)!
      setMarriageDraft(dragged.gender === 'M' ? { husbandId: dragged.id, wifeId: result.targetId } : { husbandId: result.targetId, wifeId: dragged.id })
    },
    [findTarget, evaluate, setNodes, baseNodes, run, g, data, onSelect],
  )

  const shownNodes = useMemo(
    () => (drop ? nodes.map((n) => (n.id === drop.targetId ? { ...n, data: { ...n.data, verdict: drop.verdict } } : n)) : nodes),
    [nodes, drop],
  )

  const onNodeClick: NodeMouseHandler = (_, node) => {
    if (node.type === 'person') onSelect?.({ kind: 'person', id: node.id })
    else onSelect?.({ kind: 'marriage', id: marriageIdOf(node.id)! })
  }

  return (
    <div className="canvas-wrap">
      <ReactFlow
        nodes={shownNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={editable ? onNodesChange : undefined}
        onNodeDrag={editable ? onNodeDrag : undefined}
        onNodeDragStop={editable ? onNodeDragStop : undefined}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_, node) => node.type === 'person' && onOpenProfile?.(node.id)}
        onEdgeClick={(_, edge) => {
          const d = (edge as StatusFlowEdge).data
          if (d?.claimId) onSelect?.({ kind: 'claim', id: d.claimId })
          else if (d?.kind === 'spouse') onSelect?.({ kind: 'marriage', id: marriageIdOf(edge.target)! })
        }}
        onPaneClick={() => onSelect?.(null)}
        nodesConnectable={false}
        nodesDraggable={editable}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} position={lang === 'ar' ? 'bottom-right' : 'bottom-left'} />
        {editable && <MiniMap pannable zoomable position={lang === 'ar' ? 'bottom-left' : 'bottom-right'} />}
      </ReactFlow>
      <StatusLegend className={`canvas-legend ${lang === 'ar' ? 'is-left' : 'is-right'}`} />
      {marriageDraft && (
        <MarriageDialog
          {...marriageDraft}
          onClose={(id) => {
            setMarriageDraft(null)
            if (id) onSelect?.({ kind: 'marriage', id })
          }}
        />
      )}
      {alternative && (
        <ConfirmDialog
          title={t('person.claims')}
          body={t('editor.alternativeBody', { name: personName(g.person(alternative.childId), lang) })}
          confirmLabel={t('actions.addAlternative')}
          onClose={async (ok) => {
            const a = alternative
            setAlternative(null)
            if (!ok) return
            const id = await run('Add alternative claim', (ack) => addClaim(data, { childId: a.childId, marriageId: a.marriageId, preferred: false, status: 'Disputed', confidence: 'Low' }, ack))
            if (id) onSelect?.({ kind: 'claim', id })
          }}
        />
      )}
    </div>
  )
}
