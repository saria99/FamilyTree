import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, Handle, Position, type EdgeProps, type Node, type NodeProps, type Edge } from '@xyflow/react'
import type { Confidence, KinshipKind, Marriage, Person, VerificationStatus } from '../../data/model'
import { yearOf } from '../../domain/partialDate'
import { personName, type Lang } from '../../domain/text'
import { edgeStyle, StatusBadge } from '../../shared/status'
import { PERSON_H, PERSON_W, UNION_SIZE } from '../layout/layout'

export type DropVerdict = 'ok' | 'warn' | 'bad' | null

export type PersonNodeData = { person: Person; lang: Lang; verdict: DropVerdict; isMe: boolean; dimmed: boolean }
export type UnionNodeData = { marriage: Marriage; verdict: DropVerdict; dimmed: boolean }
export type PersonFlowNode = Node<PersonNodeData, 'person'>
export type UnionFlowNode = Node<UnionNodeData, 'union'>

const hidden = { opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 }

export const PersonNode = memo(function PersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const { person, lang, verdict, isMe, dimmed } = data
  const years = [yearOf(person.birth), yearOf(person.death)]
  const lifespan = years[0] || years[1] ? `${years[0] ?? '?'}${years[1] ? `–${years[1]}` : person.isLiving ? '' : '–?'}` : ''
  const other = lang === 'ar' ? person.ismEn : person.ismAr
  return (
    <div
      className={`person-node gender-${person.gender} ${selected ? 'is-selected' : ''} ${verdict ? `drop-${verdict}` : ''} ${dimmed ? 'is-dimmed' : ''}`}
      style={{ width: PERSON_W, height: PERSON_H }}
    >
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <div className="person-name">
        {personName(person, lang)}
        {isMe && <span className="me-dot" aria-label="me">●</span>}
      </div>
      {other && <div className="person-alt" dir="auto">{other}</div>}
      <div className="person-meta">
        <span dir="ltr">{lifespan}</span>
        <span className="person-id">{person.publicId}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  )
})

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
