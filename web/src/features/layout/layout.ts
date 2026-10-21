import type { ELK as ElkApi, ElkNode } from 'elkjs/lib/elk-api'
import type { Confidence, KinshipKind, VerificationStatus } from '../../data/model'
import type { FamilyGraph } from '../../domain/graph'

export const PERSON_W = 172
export const PERSON_H = 66
export const UNION_SIZE = 30

export type LayoutNode =
  | { id: string; kind: 'person'; x: number; y: number }
  | { id: string; kind: 'union'; x: number; y: number }

export type LayoutEdge =
  | { id: string; kind: 'spouse'; source: string; target: string; status: VerificationStatus; confidence: Confidence }
  | { id: string; kind: 'child'; source: string; target: string; status: VerificationStatus; confidence: Confidence; claimId: string }
  | { id: string; kind: 'alternative'; source: string; target: string; status: VerificationStatus; confidence: Confidence; claimId: string }
  | { id: string; kind: 'kinship'; source: string; target: string; status: VerificationStatus; confidence: Confidence; linkKind: KinshipKind }

export interface Layout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
}

// Loaded on first use: elkjs is most of the bundle, so the shell paints first.
let elkInstance: Promise<ElkApi> | null = null
const getElk = () => (elkInstance ??= import('elkjs/lib/elk.bundled.js').then((m) => new m.default()))

const union = (marriageId: string) => `u:${marriageId}`

/**
 * Family layout: spouses sit in one layer, each marriage ring below them, and that marriage's children below
 * the ring, so children of different wives (or of different husbands) never mix. Alternative parentage
 * claims and kinship links are drawn but don't influence placement.
 */
export async function computeLayout(g: FamilyGraph, opts: { visible?: Set<string>; rtl: boolean }): Promise<Layout> {
  const visible = (id: string | null | undefined) => !!id && g.persons.has(id) && (!opts.visible || opts.visible.has(id))

  // Model order: each man, then each wife followed by their ring, in marriage order — ELK keeps it where it can.
  const order: string[] = []
  const placed = new Set<string>()
  const add = (id: string) => {
    if (!placed.has(id)) {
      placed.add(id)
      order.push(id)
    }
  }
  const persons = [...g.persons.values()].filter((p) => visible(p.id)).sort((a, b) => (a.birth?.y ?? 9999) - (b.birth?.y ?? 9999))
  const marriages = [...g.marriages.values()].filter((m) => visible(m.husbandId) || visible(m.wifeId))
  for (const p of persons) {
    if (p.gender !== 'M') continue
    add(p.id)
    for (const m of g.marriagesOf(p.id)) {
      if (!marriages.includes(m)) continue
      if (visible(m.wifeId)) add(m.wifeId!)
      add(union(m.id))
    }
  }
  for (const p of persons) add(p.id)
  for (const m of marriages) add(union(m.id))

  const elkEdges: { id: string; sources: string[]; targets: string[] }[] = []
  const edges: LayoutEdge[] = []
  for (const m of marriages) {
    for (const spouse of [m.husbandId, m.wifeId]) {
      if (!visible(spouse)) continue
      const id = `s:${m.id}:${spouse}`
      elkEdges.push({ id, sources: [spouse!], targets: [union(m.id)] })
      edges.push({ id, kind: 'spouse', source: spouse!, target: union(m.id), status: m.status, confidence: m.confidence })
    }
  }
  for (const c of g.data.claims) {
    const m = g.marriages.get(c.marriageId)
    if (!m || !visible(c.childId) || !marriages.includes(m)) continue
    const id = `c:${c.id}`
    if (c.preferred) {
      elkEdges.push({ id, sources: [union(m.id)], targets: [c.childId] })
      edges.push({ id, kind: 'child', source: union(m.id), target: c.childId, status: c.status, confidence: c.confidence, claimId: c.id })
    } else {
      edges.push({ id, kind: 'alternative', source: union(m.id), target: c.childId, status: c.status, confidence: c.confidence, claimId: c.id })
    }
  }
  for (const l of g.data.links) {
    if (!visible(l.personId) || !visible(l.relatedPersonId)) continue
    edges.push({ id: `k:${l.id}`, kind: 'kinship', source: l.relatedPersonId, target: l.personId, status: l.status, confidence: l.confidence, linkKind: l.kind })
  }

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.semiInteractive': 'true',
      'elk.spacing.nodeNode': '26',
      'elk.layered.spacing.nodeNodeBetweenLayers': '34',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: order.map((id) =>
      id.startsWith('u:') ? { id, width: UNION_SIZE, height: UNION_SIZE } : { id, width: PERSON_W, height: PERSON_H },
    ),
    edges: elkEdges,
  }

  const result = await (await getElk()).layout(graph)
  const width = result.width ?? 0
  const nodes: LayoutNode[] = (result.children ?? []).map((n) => {
    const w = n.width ?? 0
    const x = opts.rtl ? width - (n.x ?? 0) - w : (n.x ?? 0)
    return n.id.startsWith('u:') ? { id: n.id, kind: 'union', x, y: n.y ?? 0 } : { id: n.id, kind: 'person', x, y: n.y ?? 0 }
  })
  return { nodes, edges, width }
}

export const marriageIdOf = (nodeId: string) => (nodeId.startsWith('u:') ? nodeId.slice(2) : null)
