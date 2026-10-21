import type { Marriage, ParentageClaim, Person, TreeData } from '../data/model'

/** Read helpers over TreeData. Lineage follows preferred claims unless stated otherwise. */
export class FamilyGraph {
  readonly persons = new Map<string, Person>()
  readonly marriages = new Map<string, Marriage>()
  private readonly claimsByChild = new Map<string, ParentageClaim[]>()
  private readonly claimsByMarriage = new Map<string, ParentageClaim[]>()
  private readonly marriagesByPerson = new Map<string, Marriage[]>()

  readonly data: TreeData

  constructor(data: TreeData) {
    this.data = data
    for (const p of data.persons) this.persons.set(p.id, p)
    for (const m of data.marriages) {
      this.marriages.set(m.id, m)
      for (const id of [m.husbandId, m.wifeId]) {
        if (!id) continue
        const list = this.marriagesByPerson.get(id) ?? []
        list.push(m)
        this.marriagesByPerson.set(id, list)
      }
    }
    for (const c of data.claims) {
      push(this.claimsByChild, c.childId, c)
      push(this.claimsByMarriage, c.marriageId, c)
    }
  }

  person(id: string | null | undefined): Person | undefined {
    return id ? this.persons.get(id) : undefined
  }

  marriagesOf(personId: string): Marriage[] {
    return [...(this.marriagesByPerson.get(personId) ?? [])].sort((a, b) => (a.start?.y ?? 9999) - (b.start?.y ?? 9999))
  }

  claimsOf(childId: string): ParentageClaim[] {
    return this.claimsByChild.get(childId) ?? []
  }

  preferredClaim(childId: string): ParentageClaim | undefined {
    return this.claimsOf(childId).find((c) => c.preferred)
  }

  parentMarriage(childId: string): Marriage | undefined {
    const claim = this.preferredClaim(childId)
    return claim ? this.marriages.get(claim.marriageId) : undefined
  }

  father(childId: string): Person | undefined {
    return this.person(this.parentMarriage(childId)?.husbandId)
  }

  mother(childId: string): Person | undefined {
    return this.person(this.parentMarriage(childId)?.wifeId)
  }

  parents(childId: string, allClaims = false): Person[] {
    const claims = allClaims ? this.claimsOf(childId) : [this.preferredClaim(childId)].filter(Boolean)
    const result: Person[] = []
    for (const c of claims as ParentageClaim[]) {
      const m = this.marriages.get(c.marriageId)
      for (const id of [m?.husbandId, m?.wifeId]) {
        const p = this.person(id)
        if (p) result.push(p)
      }
    }
    return result
  }

  childrenOf(marriageId: string, preferredOnly = true): Person[] {
    return (this.claimsByMarriage.get(marriageId) ?? [])
      .filter((c) => !preferredOnly || c.preferred)
      .map((c) => this.persons.get(c.childId))
      .filter((p): p is Person => !!p)
      .sort((a, b) => (a.birth?.y ?? 9999) - (b.birth?.y ?? 9999))
  }

  alternativeClaimsOn(marriageId: string): ParentageClaim[] {
    return (this.claimsByMarriage.get(marriageId) ?? []).filter((c) => !c.preferred)
  }

  /** Paternal chain, nearest first. */
  fathers(personId: string, max = 40): Person[] {
    const chain: Person[] = []
    const seen = new Set([personId])
    let current = this.father(personId)
    while (current && chain.length < max && !seen.has(current.id)) {
      chain.push(current)
      seen.add(current.id)
      current = this.father(current.id)
    }
    return chain
  }

  /** Maternal chain, nearest first. */
  mothers(personId: string, max = 40): Person[] {
    const chain: Person[] = []
    const seen = new Set([personId])
    let current = this.mother(personId)
    while (current && chain.length < max && !seen.has(current.id)) {
      chain.push(current)
      seen.add(current.id)
      current = this.mother(current.id)
    }
    return chain
  }

  /** All ancestors (ids). With allClaims, alternative claims are followed too (used for cycle checks). */
  ancestors(personId: string, allClaims = false): Set<string> {
    const result = new Set<string>()
    const stack = [personId]
    while (stack.length) {
      const id = stack.pop()!
      for (const parent of this.parents(id, allClaims)) {
        if (!result.has(parent.id)) {
          result.add(parent.id)
          stack.push(parent.id)
        }
      }
    }
    return result
  }

  descendants(personId: string): Set<string> {
    const result = new Set<string>()
    const stack = [personId]
    while (stack.length) {
      const id = stack.pop()!
      for (const m of this.marriagesOf(id)) {
        for (const child of this.childrenOf(m.id)) {
          if (!result.has(child.id)) {
            result.add(child.id)
            stack.push(child.id)
          }
        }
      }
    }
    return result
  }

  /** Members of a branch rooted at a marriage or a person (descendants + optionally their spouses). */
  branchMembers(branch: { rootPersonId?: string; rootMarriageId?: string }): Set<string> {
    const members = new Set<string>()
    const roots: string[] = []
    if (branch.rootMarriageId) {
      const m = this.marriages.get(branch.rootMarriageId)
      if (m?.husbandId) members.add(m.husbandId)
      if (m?.wifeId) members.add(m.wifeId)
      for (const child of this.childrenOf(branch.rootMarriageId)) roots.push(child.id)
    } else if (branch.rootPersonId) {
      roots.push(branch.rootPersonId)
    }
    for (const root of roots) {
      members.add(root)
      for (const d of this.descendants(root)) members.add(d)
    }
    for (const id of [...members]) {
      for (const m of this.marriagesOf(id)) {
        if (m.husbandId) members.add(m.husbandId)
        if (m.wifeId) members.add(m.wifeId)
      }
    }
    return members
  }
}

function push<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key) ?? []
  list.push(value)
  map.set(key, list)
}
