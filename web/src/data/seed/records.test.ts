import { describe, expect, it } from 'vitest'
import { createBayrabSeed } from '.'
import { FamilyGraph } from '../../domain/graph'
import { recordsToTree, type RecordsFile } from './records'

describe('Bayrab seed', () => {
  it('loads the founder with his ID, branch and source, and nothing invented', () => {
    const data = createBayrabSeed()
    expect(data.persons).toHaveLength(1)
    const founder = data.persons[0]
    expect(founder.publicId).toBe('P-0001')
    expect(founder.ismEn).toBe('Sharaf al-Din Wad Arki')
    expect(data.marriages).toHaveLength(0)
    expect(data.claims).toHaveLength(0)
    expect(data.branches[0]).toMatchObject({ nameEn: 'Bayrab founding lineage', rootPersonId: 'P-0001' })
    expect(data.citations).toEqual([expect.objectContaining({ sourceId: 'SRC-CHAT-001', target: { kind: 'person', id: 'P-0001', fact: 'General' } })])
    expect(data.tree.nextPersonNumber).toBe(2)
    expect(data.tree.idDigits).toBe(4)
  })
})

describe('recordsToTree', () => {
  const file = (persons: RecordsFile['persons']): RecordsFile => ({ tree: { nameEn: 'T', idPrefix: 'P', idDigits: 4 }, persons })

  it('links children to the marriage of their father and mother, once per couple', () => {
    const data = recordsToTree(
      file([
        { personId: 'P-0001', primaryName: 'Father', fatherId: null, motherId: null, spouseIds: ['P-0002'], status: 'reported', sourceIds: ['S1'] },
        { personId: 'P-0002', primaryName: 'Mother', fatherId: null, motherId: null, spouseIds: ['P-0001'] },
        { personId: 'P-0003', primaryName: 'Son', gender: 'M', fatherId: 'P-0001', motherId: 'P-0002', spouseIds: [] },
        { personId: 'P-0004', primaryName: 'Daughter', gender: 'F', fatherId: 'P-0001', motherId: 'P-0002', spouseIds: [] },
      ]),
    )
    expect(data.marriages).toHaveLength(1)
    expect(data.marriages[0]).toMatchObject({ husbandId: 'P-0001', wifeId: 'P-0002', status: 'OralAccount' })
    const g = new FamilyGraph(data)
    expect(g.childrenOf(data.marriages[0].id).map((p) => p.id)).toEqual(['P-0003', 'P-0004'])
    expect(data.sources.map((s) => s.id)).toEqual(['S1'])
  })

  it('uses a placeholder marriage when only the father is known', () => {
    const data = recordsToTree(
      file([
        { personId: 'P-0001', primaryName: 'Father', fatherId: null, motherId: null, spouseIds: [] },
        { personId: 'P-0002', primaryName: 'Son', gender: 'M', fatherId: 'P-0001', motherId: null, spouseIds: [] },
        { personId: 'P-0003', primaryName: 'Son 2', gender: 'M', fatherId: 'P-0001', motherId: null, spouseIds: [] },
      ]),
    )
    expect(data.marriages).toEqual([expect.objectContaining({ husbandId: 'P-0001', wifeId: null })])
    expect(data.claims).toHaveLength(2)
  })

  it('reports unknown references and unknown gender instead of guessing', () => {
    const run = () => recordsToTree(file([{ personId: 'P-0001', primaryName: 'X', fatherId: 'P-0099', motherId: null, spouseIds: [] }]))
    expect(run).toThrow(/unknown person P-0099/)
    expect(run).toThrow(/P-0001: gender is unknown/)
  })
})
