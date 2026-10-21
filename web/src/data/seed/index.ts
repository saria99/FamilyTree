import type { TreeData } from '../model'
import records from './bayrab-records.json'
import { recordsToTree, type RecordsFile } from './records'

/** The Bayrab seed: built from bayrab-records.json. Add more person records there. */
export function createBayrabSeed(): TreeData {
  return recordsToTree(records as RecordsFile)
}
