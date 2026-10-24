import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, Handle, Position, type EdgeProps, type Node, type NodeProps, type Edge } from '@xyflow/react'
import type { Confidence, KinshipKind, Marriage, Person, VerificationStatus } from '../../data/model'
import { yearOf } from '../../domain/partialDate'
import { personName, type Lang } from '../../domain/text'
import { edgeStyle, StatusBadge } from '../../shared/status'
import { PERSON_H, PERSON_W, UNION_SIZE } from '../layout/layout'

export type DropVerdict = 'ok' | 'warn' | 'bad' | null

export type PersonNodeData = {
  person: Person
  lang: Lang
  verdict: DropVerdict
  isMe: boolean
  dimmed: boolean
  editable: boolean
  labels: { parents: string; sibling: string; children: string; addParent: string; addSibling: string; addChild: string }
  /** "+" on a point: add a new parent / sibling / child. */
  onAdd?: (personId: string, kind: 'parent' | 'sibling' | 'child') => void
}
export type UnionNodeData = { marriage: Marriage; verdict: DropVerdict; dimmed: boolean }
export type PersonFlowNode = Node<PersonNodeData, 'person'>
export type UnionFlowNode = Node<UnionNodeData, 'union'>

const hidden = { opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 }

/** Handle ids on the diamond: drag from one to another person to create that relationship. */
export const HANDLE = { parents: 'parents', siblingStart: 'sibling-start', siblingEnd: 'sibling-end', children: 'children', in: 'in' } as const

/**
 * A person is a diamond (FR-046): the top point connects to parents, the side points to siblings and the
 * bottom point to children. Existing lines arrive at the top (from the parents' ring) and leave from the bottom.
 */
export const PersonNode = memo(function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const { person, lang, verdict, isMe, dimmed, editable, labels, onAdd } = data
  const years = [yearOf(person.birth), yearOf(person.death)]
  const lifespan = years[0] || years[1] ? `${years[0] ?? '?'}${years[1] ? `–${years[1]}` : person.isLiving ? '' : '–?'}` : ''
  const other = person.ismAr && person.ismEn ? (lang === 'ar' ? person.ismEn : person.ismAr) : undefined
  const W = PERSON_W
  const H = PERSON_H
  const connector = (id: string, position: Position, title: string) => (
    <Handle id={id} type="source" position={position} isConnectable={editable} className={`diamond-handle ${editable ? '' : 'is-hidden'}`} title={title} aria-label={title} />
  )
  return (
    <div
      className={`person-node gender-${person.gender} ${selected ? 'is-selected' : ''} ${verdict ? `drop-${verdict}` : ''} ${dimmed ? 'is-dimmed' : ''}`}
      style={{ width: W, height: H }}
    >
      <svg className="diamond-shape" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <polygon points={`${W / 2},2 ${W - 2},${H / 2} ${W / 2},${H - 2} 2,${H / 2}`} />
      </svg>
      <Handle id={HANDLE.in} type="target" position={Position.Top} style={hidden} isConnectable={false} />
      {connector(HANDLE.parents, Position.Top, labels.parents)}
      {connector(HANDLE.siblingStart, Position.Left, labels.sibling)}
      {connector(HANDLE.siblingEnd, Position.Right, labels.sibling)}
      {connector(HANDLE.children, Position.Bottom, labels.children)}
      {editable && onAdd && (
        <>
          <AddButton side="top" label={labels.addParent} onClick={() => onAdd(person.id, 'parent')} />
          <AddButton side="start" label={labels.addSibling} onClick={() => onAdd(person.id, 'sibling')} />
          <AddButton side="end" label={labels.addSibling} onClick={() => onAdd(person.id, 'sibling')} />
          <AddButton side="bottom" label={labels.addChild} onClick={() => onAdd(person.id, 'child')} />
        </>
      )}
      <div className="diamond-body">
        <div className="person-name">
          {personName(person, lang)}
          {isMe && <span className="me-dot" aria-label="me">●</span>}
        </div>
        {other && <div className="person-alt" dir="auto">{other}</div>}
        {lifespan && <div className="person-years" dir="ltr">{lifespan}</div>}
        <div className="person-id">{person.publicId}</div>
      </div>
    </div>
  )
})

/** A small "+ Add …" pill just outside a diamond point; `nodrag` keeps a click from starting a node drag. */
function AddButton({ side, label, onClick }: { side: 'top' | 'bottom' | 'start' | 'end'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`add-relative nodrag nopan add-${side}`}
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      + <span>{label}</span>
    </button>
  )
}

const END_GLYPH: Record<Marriage['endReason'], string> = {
  Ongoing: '●', Divorce: '×', Khul: '×', Annulment: '⊘', DeathOfHusband: '◌', DeathOfWife: '◌', Unknown: '·',
}

export const UnionNode = memo(function UnionNode({ data, selected }: NodeProps<UnionFlowNode>) {
  const { marriage, verdict, dimmed } = data
  const placeholder = !marriage.husbandId || !marriage.wifeId
  return (
    <div
      className={`union-node status-${marriage.status} ${placeholder ? 'is-placeholder' : ''} ${selected ? 'is-selected' : ''} ${verdict ? `drop-${verdict}` : ''} ${dimmed ? 'is-dimmed' : ''}`}
      style={{ width: UNION_SIZE, height: UNION_SIZE }}
      title={`${marriage.start?.y ?? '?'}${marriage.end?.y ? `–${marriage.end.y}` : ''}`}
    >
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <span aria-hidden>{END_GLYPH[marriage.endReason]}</span>
      {marriage.flags.length > 0 && <span className="union-flag" aria-label="warning confirmed">!</span>}
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  )
})

export type StatusEdgeData = {
  kind: 'spouse' | 'child' | 'alternative' | 'kinship'
  status: VerificationStatus
  confidence: Confidence
  label?: string
  linkKind?: KinshipKind
  claimId?: string
  dimmed?: boolean
}
export type StatusFlowEdge = Edge<StatusEdgeData, 'status'>

export const StatusEdge = memo(function StatusEdge(props: EdgeProps<StatusFlowEdge>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props
  const curved = data?.kind === 'alternative' || data?.kind === 'kinship'
  const [path, labelX, labelY] = curved
    ? getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.35 })
    : getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 8 })
  const style = edgeStyle(data?.status ?? 'Unconfirmed', data?.confidence ?? 'Low')
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        interactionWidth={14}
        style={{
          ...style,
          strokeWidth: (style.strokeWidth ?? 1) + (selected ? 1.5 : 0),
          opacity: data?.dimmed ? 0.25 : data?.kind === 'kinship' ? 0.75 : 1,
        }}
      />
      {(data?.kind === 'alternative' || data?.label) && (
        <EdgeLabelRenderer>
          <div className="edge-label" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            {data.label ?? <StatusBadge status={data.status} compact />}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

export const nodeTypes = { person: PersonNode, union: UnionNode }
export const edgeTypes = { status: StatusEdge }
