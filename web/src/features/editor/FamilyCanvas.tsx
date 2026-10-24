import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
  type OnConnectEnd,
  type OnConnectStart,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLang } from '../../app/i18n'
import { useGraph, useStoreApi, useTreeData } from '../../app/store'
import { addClaim, ensurePlaceholder, type RelativeKind, moveClaim, setPosition, siblingNeedsParent, siblingTarget, type CommandResult } from '../../data/commands'
import type { TreeData } from '../../data/model'
import { checkMarriage, checkParentage, violations, type RuleOutcome } from '../../domain/rules'
import { personName } from '../../domain/text'
import { StatusLegend } from '../../shared/status'
import { computeLayout, marriageIdOf, PERSON_H, PERSON_W, UNION_SIZE, type Layout } from '../layout/layout'
import { AddRelativeDialog } from './AddRelativeDialog'
import { ChoiceDialog, MarriageDialog, type Choice } from './forms'
import { edgeTypes, HANDLE, nodeTypes, type DropVerdict, type StatusFlowEdge } from './nodes'
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
type ChoiceRequest = { title: string; body: string; choices: Choice[]; resolve: (value: string | null) => void }

/** "Which marriage" answers: an existing marriage id, or "unknown:<parentId>" for the parent's placeholder. */
const UNKNOWN = 'unknown:'

/** Where a marriage ring sits when one of its spouses was moved by hand: centred below the spouses. */
function ringPosition(spouses: { x: number; y: number }[]) {
  const x = spouses.reduce((sum, p) => sum + p.x + PERSON_W / 2, 0) / spouses.length - UNION_SIZE / 2
  const y = Math.max(...spouses.map((p) => p.y)) + PERSON_H + 18
  return { x, y }
}

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
  const [choice, setChoice] = useState<ChoiceRequest | null>(null)
  const [adding, setAdding] = useState<{ anchorId: string; kind: RelativeKind } | null>(null)
  const connecting = useRef<{ nodeId: string; handleId: string } | null>(null)
  const fitted = useRef(false)

  const ask = useCallback((title: string, body: string, choices: Choice[]) => new Promise<string | null>((resolve) => setChoice({ title, body, choices, resolve })), [])

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

  const labels = useMemo(
    () => ({
      parents: t('editor.handleParents'),
      sibling: t('editor.handleSibling'),
      children: t('editor.handleChildren'),
      addParent: t('addRelative.addParent'),
      addSibling: t('addRelative.addSibling'),
      addChild: t('addRelative.addChild'),
    }),
    [t],
  )
  const onAdd = useCallback((anchorId: string, kind: RelativeKind) => setAdding({ anchorId, kind }), [])

  const baseNodes = useMemo<Node[]>(() => {
    if (!layout) return []
    // The layout is computed asynchronously; skip anything removed since (e.g. right after Undo).
    const exists = (n: { id: string; kind: string }) => (n.kind === 'person' ? g.persons.has(n.id) : g.marriages.has(marriageIdOf(n.id)!))
    const manual = data.positions ?? {}
    const personPos = new Map(layout.nodes.filter((n) => n.kind === 'person').map((n) => [n.id, manual[n.id] ?? { x: n.x, y: n.y }]))
    return layout.nodes.filter(exists).map((n) => {
      if (n.kind === 'person') {
        return {
          id: n.id,
          type: 'person',
          position: personPos.get(n.id)!,
          draggable: editable,
          selected: selection?.kind === 'person' && selection.id === n.id,
          data: { person: g.person(n.id)!, lang, verdict: null, isMe: n.id === meId, dimmed: false, editable, labels, onAdd },
        }
      }
      const marriage = g.marriages.get(marriageIdOf(n.id)!)!
      const spouses = [marriage.husbandId, marriage.wifeId].filter((id): id is string => !!id && personPos.has(id))
      const position = spouses.some((id) => manual[id]) ? ringPosition(spouses.map((id) => personPos.get(id)!)) : { x: n.x, y: n.y }
      return {
        id: n.id,
        type: 'union',
        position,
        draggable: false,
        selected: selection?.kind === 'marriage' && selection.id === marriage.id,
        data: { marriage, verdict: null, dimmed: false },
      }
    })
  }, [layout, g, data.positions, lang, editable, selection, meId, labels, onAdd])

  useEffect(() => setNodes(baseNodes), [baseNodes, setNodes])

  useEffect(() => {
    if (!layout || layout.nodes.length === 0) return
    if (focusId && layout.nodes.some((n) => n.id === focusId)) {
      const n = layout.nodes.find((x) => x.id === focusId)!
      const p = data.positions?.[focusId] ?? n
      void flow.setCenter(p.x + PERSON_W / 2, p.y + PERSON_H / 2, { zoom: 1, duration: 300 })
    } else if (!fitted.current) {
      fitted.current = true
      requestAnimationFrame(() => void flow.fitView({ padding: 0.15 }))
    }
    // Positions are deliberately not a dependency: moving a person must not re-centre the view.
  }, [layout, focusId, flow])

  const edges = useMemo<StatusFlowEdge[]>(() => {
    if (!layout) return []
    const ids = new Set(baseNodes.map((n) => n.id))
    return layout.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        // Lines leave a diamond from its bottom point and arrive at its top point.
        sourceHandle: e.kind === 'spouse' || e.kind === 'kinship' ? HANDLE.children : undefined,
        targetHandle: e.kind === 'child' || e.kind === 'alternative' || e.kind === 'kinship' ? HANDLE.in : undefined,
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

  /** Show an integrity refusal through the shared rules dialog. */
  const refuse = useCallback((command: () => CommandResult) => run('', command), [run])

  /**
   * Make `childId` a child of a marriage. `prepare` may create the parent's placeholder marriage first, in the same
   * undo step. If the child already has preferred parents the admin chooses Move here or Add as alternative claim.
   */
  const relate = useCallback(
    async (childId: string, target: string, label = 'Add child') => {
      const resolve = (d: TreeData) => {
        if (!target.startsWith(UNKNOWN)) return { data: d, marriageId: target }
        const parent = g.person(target.slice(UNKNOWN.length))!
        return ensurePlaceholder(d, parent.id, parent.gender)
      }
      const preferred = g.preferredClaim(childId)
      if (!preferred) {
        const id = await run(label, (ack) => {
          const r = resolve(data)
          return addClaim(r.data, { childId, marriageId: r.marriageId, preferred: true, status: 'Unconfirmed', confidence: 'Low' }, ack)
        })
        if (id) onSelect?.({ kind: 'claim', id })
        return
      }
      if (preferred.marriageId === target) return
      const current = g.marriages.get(preferred.marriageId)
      const parents = [current?.husbandId, current?.wifeId].filter(Boolean).map((id) => personName(g.person(id), lang)).join(' ⚭ ')
      const answer = await ask(t('editor.shiftTitle'), t('editor.shiftBody', { name: personName(g.person(childId), lang), parents }), [
        { value: 'move', label: t('editor.moveHere'), primary: true },
        { value: 'alternative', label: t('actions.addAlternative') },
      ])
      if (answer === 'move') {
        const id = await run('Move child', () => {
          const r = resolve(data)
          return moveClaim(r.data, preferred.id, r.marriageId)
        })
        if (id) onSelect?.({ kind: 'claim', id })
      } else if (answer === 'alternative') {
        const id = await run('Add alternative claim', (ack) => {
          const r = resolve(data)
          return addClaim(r.data, { childId, marriageId: r.marriageId, preferred: false, status: 'Disputed', confidence: 'Low' }, ack)
        })
        if (id) onSelect?.({ kind: 'claim', id })
      }
    },
    [g, data, run, ask, t, lang, onSelect],
  )

  /** Choose which of the parent's marriages a new child belongs to (or "other parent unknown"). */
  const pickParentMarriage = useCallback(
    async (parentId: string): Promise<string | null> => {
      const parent = g.person(parentId)!
      const marriages = g.marriagesOf(parentId)
      const real = marriages.filter((m) => m.husbandId && m.wifeId)
      const placeholder = marriages.find((m) => !m.husbandId || !m.wifeId)
      const unknown = placeholder ? placeholder.id : UNKNOWN + parentId
      if (real.length === 0) return unknown
      const choices: Choice[] = real.map((m, i) => ({
        value: m.id,
        primary: i === 0,
        label: t('editor.withSpouse', { name: personName(g.person(parent.gender === 'M' ? m.wifeId : m.husbandId), lang) }) + (m.start?.y ? ` (${m.start.y})` : ''),
      }))
      choices.push({ value: unknown, label: t('editor.otherParentUnknown') })
      return ask(t('editor.pickMarriageTitle'), t('editor.pickMarriageBody', { name: personName(parent, lang) }), choices)
    },
    [g, ask, t, lang],
  )

  // ---- Dragging a whole person: marry, add as child, or just arrange ----

  const evaluate = useCallback(
    (draggedId: string, targetId: string): DropTarget | null => {
      const dragged = g.person(draggedId)
      if (!dragged) return null
      const marriageId = marriageIdOf(targetId)
      let outcome: RuleOutcome
      if (marriageId) {
        const hasPreferred = !!g.preferredClaim(draggedId)
        outcome = checkParentage(data, { childId: draggedId, marriageId, preferred: false, status: 'Unconfirmed' })
        const verdict: DropVerdict = violations(outcome).length ? 'bad' : hasPreferred ? 'warn' : 'ok'
        return { draggedId, targetId, verdict, outcome }
      }
      const target = g.person(targetId)
      if (!target) return null
      const [husbandId, wifeId] = dragged.gender === 'M' ? [dragged.id, target.id] : [target.id, dragged.id]
      outcome = checkMarriage(data, { husbandId, wifeId, endReason: 'Ongoing', status: 'Unconfirmed', confidence: 'Low' })
      return { draggedId, targetId, verdict: violations(outcome).length ? 'bad' : 'ok', outcome }
    },
    [g, data],
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
      if (!result) {
        // Dropped on empty canvas: keep it where it was put (FR-047).
        await run('Move person', () => setPosition(data, node.id, node.position))
        return
      }
      setNodes(baseNodes)
      if (result.verdict === 'bad') {
        await refuse(() => ({ ok: false, outcome: { results: violations(result.outcome) } }))
        return
      }
      const marriageId = marriageIdOf(result.targetId)
      if (marriageId) {
        await relate(result.draggedId, marriageId)
        return
      }
      const dragged = g.person(result.draggedId)!
      setMarriageDraft(dragged.gender === 'M' ? { husbandId: dragged.id, wifeId: result.targetId } : { husbandId: result.targetId, wifeId: dragged.id })
    },
    [findTarget, evaluate, setNodes, baseNodes, run, refuse, relate, g, data],
  )

  // ---- Dragging from a diamond connector: parent / sibling / child ----

  const onConnectStart: OnConnectStart = useCallback((_, params) => {
    connecting.current = params.nodeId && params.handleId ? { nodeId: params.nodeId, handleId: params.handleId } : null
  }, [])

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event) => {
      const from = connecting.current
      connecting.current = null
      if (!from) return
      const point = 'changedTouches' in event ? event.changedTouches[0] : event
      const element = document.elementFromPoint(point.clientX, point.clientY)
      const targetId = element?.closest('.react-flow__node')?.getAttribute('data-id')
      if (!targetId || targetId === from.nodeId) return

      const ringMarriage = marriageIdOf(targetId)
      if (ringMarriage) {
        // A connector dropped on a marriage ring: the person becomes a child of that marriage.
        if (from.handleId === HANDLE.parents) await relate(from.nodeId, ringMarriage)
        return
      }
      if (from.handleId === HANDLE.parents) {
        const marriage = await pickParentMarriage(targetId)
        if (marriage) await relate(from.nodeId, marriage, 'Add parent')
      } else if (from.handleId === HANDLE.children) {
        const marriage = await pickParentMarriage(from.nodeId)
        if (marriage) await relate(targetId, marriage, 'Add child')
      } else {
        const link = siblingTarget(data, from.nodeId, targetId)
        if (!link) await refuse(siblingNeedsParent)
        else await relate(link.childId, link.marriageId, 'Add sibling')
      }
    },
    [data, relate, pickParentMarriage, refuse],
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
        onConnectStart={editable ? onConnectStart : undefined}
        onConnectEnd={editable ? onConnectEnd : undefined}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_, node) => node.type === 'person' && onOpenProfile?.(node.id)}
        onEdgeClick={(_, edge) => {
          const d = (edge as StatusFlowEdge).data
          if (d?.claimId) onSelect?.({ kind: 'claim', id: d.claimId })
          else if (d?.kind === 'spouse') onSelect?.({ kind: 'marriage', id: marriageIdOf(edge.target)! })
        }}
        onPaneClick={() => onSelect?.(null)}
        connectionMode={ConnectionMode.Loose}
        nodesConnectable={editable}
        nodesDraggable={editable}
        connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 2, strokeDasharray: '6 4' }}
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
      {adding && (
        <AddRelativeDialog
          {...adding}
          onClose={(id) => {
            setAdding(null)
            if (id) onSelect?.({ kind: 'person', id })
          }}
        />
      )}
      {choice && (
        <ChoiceDialog
          title={choice.title}
          body={choice.body}
          choices={choice.choices}
          onClose={(value) => {
            choice.resolve(value)
            setChoice(null)
          }}
        />
      )}
    </div>
  )
}
