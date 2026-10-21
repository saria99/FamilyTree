import { z } from 'zod'
import type { TreeData } from './model'

// Download / open the tree as a JSON file — the prototype's "save" and the format reviewers send back
// with feedback. The backend import (Phase 11) accepts this format too.

const partialDate = z.object({ y: z.number().optional(), m: z.number().optional(), d: z.number().optional(), approx: z.boolean().optional() }).optional()
const status = z.enum(['Verified', 'OralAccount', 'Disputed', 'Unconfirmed'])
const confidence = z.enum(['High', 'Medium', 'Low'])

const schema = z.object({
  format: z.literal('bayrab-prototype'),
  version: z.literal(1),
  tree: z.object({
    nameAr: z.string(),
    nameEn: z.string(),
    idPrefix: z.string(),
    nextPersonNumber: z.number(),
    iddahDivorceDays: z.number(),
    iddahWidowDays: z.number(),
    maxPregnancyDays: z.number(),
  }),
  persons: z.array(
    z.object({
      id: z.string(),
      publicId: z.string(),
      gender: z.enum(['M', 'F']),
      ismAr: z.string().optional(),
      ismEn: z.string().optional(),
      laqabAr: z.string().optional(),
      laqabEn: z.string().optional(),
      familyAr: z.string().optional(),
      familyEn: z.string().optional(),
      birth: partialDate,
      death: partialDate,
      isLiving: z.boolean(),
      notes: z.string().optional(),
    }),
  ),
  marriages: z.array(
    z.object({
      id: z.string(),
      husbandId: z.string().nullable(),
      wifeId: z.string().nullable(),
      start: partialDate,
      end: partialDate,
      endReason: z.enum(['Ongoing', 'Divorce', 'Khul', 'Annulment', 'DeathOfHusband', 'DeathOfWife', 'Unknown']),
      divorceKind: z.enum(['Revocable', 'IrrevocableMinor', 'IrrevocableMajor']).optional(),
      divorceCount: z.number().optional(),
      notes: z.string().optional(),
      flags: z.array(z.string()),
      status,
      confidence,
    }),
  ),
  claims: z.array(z.object({ id: z.string(), childId: z.string(), marriageId: z.string(), preferred: z.boolean(), flags: z.array(z.string()), status, confidence })),
  links: z.array(z.object({ id: z.string(), kind: z.enum(['Guardianship', 'MilkMother', 'MilkFather']), personId: z.string(), relatedPersonId: z.string(), status, confidence })),
  sources: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['Document', 'Book', 'OfficialRecord', 'Gravestone', 'Photo', 'Website', 'OralAccount', 'Other']),
      title: z.string(),
      author: z.string().optional(),
      narratorName: z.string().optional(),
      toldOn: partialDate,
      recordedBy: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  citations: z.array(
    z.object({
      id: z.string(),
      sourceId: z.string(),
      target: z.union([
        z.object({ kind: z.enum(['marriage', 'claim', 'kinship']), id: z.string() }),
        z.object({ kind: z.literal('person'), id: z.string(), fact: z.enum(['General', 'Name', 'Birth', 'Death']) }),
      ]),
      detail: z.string().optional(),
      quotation: z.string().optional(),
    }),
  ),
  branches: z.array(z.object({ id: z.string(), nameAr: z.string().optional(), nameEn: z.string().optional(), rootPersonId: z.string().optional(), rootMarriageId: z.string().optional(), color: z.string() })),
})

export function downloadTree(data: TreeData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.tree.idPrefix.toLowerCase()}-tree-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function readTreeFile(file: File): Promise<TreeData> {
  const parsed = schema.safeParse(JSON.parse(await file.text()))
  if (!parsed.success) throw new Error(parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  return parsed.data as TreeData
}
