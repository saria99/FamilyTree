import type { TreeData } from './model'

// FICTIONAL sample family for the visual prototype. Never put real family records here:
// the prototype is a public static site with no login and no redaction.
//
// Shape (generation by generation):
//   Salim (d. 1950)  ── Maryam
//     └─ Hamid (1925–1998)  ── wives: Aminah (1950 →), Khadijah (1955 →), Sawdah (1962 →)
//          Aminah's children: Yusuf, Fatimah        Khadijah's children: Ali, Zaynab
//          Sawdah's child: Hasan (parentage disputed: an oral account says Khadijah)
//   Ruqayyah married Idris (1970, divorced 1975), then Hamza (1976 →) — sequential husbands
//     Idris's child: Layla        Hamza's child: Umar
//   Ali ── Ruqayyah's daughter Layla (1990) → children: Salma, Ibrahim
//   Kafala: Hamid guardian of Nuh. Milk kinship: Aminah is milk mother of Umar.

const v = (status: 'Verified' | 'OralAccount' | 'Disputed' | 'Unconfirmed', confidence: 'High' | 'Medium' | 'Low') => ({ status, confidence })

export function createSampleFamily(): TreeData {
  return {
    format: 'bayrab-prototype',
    version: 1,
    tree: {
      nameAr: 'عائلة تجريبية',
      nameEn: 'Demo Family',
      idPrefix: 'DEMO',
      nextPersonNumber: 22,
      iddahDivorceDays: 90,
      iddahWidowDays: 130,
      maxPregnancyDays: 1461,
    },
    persons: [
      { id: 'p1', publicId: 'DEMO-000001', gender: 'M', ismAr: 'سالم', ismEn: 'Salim', familyAr: 'التجريبي', familyEn: 'Al-Demo', birth: { y: 1890, approx: true }, death: { y: 1950 }, isLiving: false },
      { id: 'p2', publicId: 'DEMO-000002', gender: 'F', ismAr: 'مريم', ismEn: 'Maryam', birth: { y: 1898, approx: true }, death: { y: 1961 }, isLiving: false },
      { id: 'p3', publicId: 'DEMO-000003', gender: 'M', ismAr: 'حامد', ismEn: 'Hamid', laqabAr: 'أبو يوسف', laqabEn: 'Abu Yusuf', birth: { y: 1925 }, death: { y: 1998, m: 3 }, isLiving: false },
      { id: 'p4', publicId: 'DEMO-000004', gender: 'F', ismAr: 'آمنة', ismEn: 'Aminah', birth: { y: 1932 }, death: { y: 2005 }, isLiving: false },
      { id: 'p5', publicId: 'DEMO-000005', gender: 'F', ismAr: 'خديجة', ismEn: 'Khadijah', birth: { y: 1936 }, death: { y: 2010 }, isLiving: false },
      { id: 'p6', publicId: 'DEMO-000006', gender: 'F', ismAr: 'سودة', ismEn: 'Sawdah', birth: { y: 1941 }, isLiving: true },
      { id: 'p7', publicId: 'DEMO-000007', gender: 'M', ismAr: 'يوسف', ismEn: 'Yusuf', birth: { y: 1952 }, isLiving: true },
      { id: 'p8', publicId: 'DEMO-000008', gender: 'F', ismAr: 'فاطمة', ismEn: 'Fatimah', birth: { y: 1955 }, isLiving: true },
      { id: 'p9', publicId: 'DEMO-000009', gender: 'M', ismAr: 'علي', ismEn: 'Ali', birth: { y: 1957, m: 6 }, isLiving: true },
      { id: 'p10', publicId: 'DEMO-000010', gender: 'F', ismAr: 'زينب', ismEn: 'Zaynab', birth: { y: 1960 }, isLiving: true },
      { id: 'p11', publicId: 'DEMO-000011', gender: 'M', ismAr: 'حسن', ismEn: 'Hasan', birth: { y: 1964 }, isLiving: true },
      { id: 'p12', publicId: 'DEMO-000012', gender: 'F', ismAr: 'رقية', ismEn: 'Ruqayyah', birth: { y: 1950 }, isLiving: true },
      { id: 'p13', publicId: 'DEMO-000013', gender: 'M', ismAr: 'إدريس', ismEn: 'Idris', birth: { y: 1945 }, death: { y: 2001 }, isLiving: false },
      { id: 'p14', publicId: 'DEMO-000014', gender: 'M', ismAr: 'حمزة', ismEn: 'Hamza', birth: { y: 1948 }, isLiving: true },
      { id: 'p15', publicId: 'DEMO-000015', gender: 'F', ismAr: 'ليلى', ismEn: 'Layla', birth: { y: 1972 }, isLiving: true },
      { id: 'p16', publicId: 'DEMO-000016', gender: 'M', ismAr: 'عمر', ismEn: 'Umar', birth: { y: 1978 }, isLiving: true },
      { id: 'p17', publicId: 'DEMO-000017', gender: 'F', ismAr: 'سلمى', ismEn: 'Salma', birth: { y: 1992 }, isLiving: true },
      { id: 'p18', publicId: 'DEMO-000018', gender: 'M', ismAr: 'إبراهيم', ismEn: 'Ibrahim', birth: { y: 1995 }, isLiving: true },
      { id: 'p19', publicId: 'DEMO-000019', gender: 'M', ismAr: 'نوح', ismEn: 'Nuh', birth: { y: 1960 }, isLiving: true, notes: 'Orphan raised by Hamid under kafala.' },
      { id: 'p20', publicId: 'DEMO-000020', gender: 'M', ismAr: 'عبدالله', ismEn: 'Abdullah', birth: { y: 1896, approx: true }, death: { y: 1960 }, isLiving: false },
      { id: 'p21', publicId: 'DEMO-000021', gender: 'F', ismAr: 'حليمة', ismEn: 'Halimah', birth: { y: 1900, approx: true }, death: { y: 1970 }, isLiving: false },
    ],
    marriages: [
      { id: 'm1', husbandId: 'p1', wifeId: 'p2', start: { y: 1920 }, end: { y: 1950 }, endReason: 'DeathOfHusband', ...v('Verified', 'High'), flags: [] },
      { id: 'm2', husbandId: 'p3', wifeId: 'p4', start: { y: 1950, m: 4 }, end: { y: 1998, m: 3 }, endReason: 'DeathOfHusband', ...v('Verified', 'High'), flags: [] },
      { id: 'm3', husbandId: 'p3', wifeId: 'p5', start: { y: 1955 }, end: { y: 1998, m: 3 }, endReason: 'DeathOfHusband', ...v('OralAccount', 'Medium'), flags: [] },
      { id: 'm4', husbandId: 'p3', wifeId: 'p6', start: { y: 1962 }, end: { y: 1998, m: 3 }, endReason: 'DeathOfHusband', ...v('Unconfirmed', 'Low'), flags: [] },
      { id: 'm5', husbandId: 'p13', wifeId: 'p12', start: { y: 1970 }, end: { y: 1975, m: 2 }, endReason: 'Divorce', divorceKind: 'Revocable', divorceCount: 1, ...v('Verified', 'Medium'), flags: [] },
      { id: 'm6', husbandId: 'p14', wifeId: 'p12', start: { y: 1976 }, endReason: 'Ongoing', ...v('Verified', 'High'), flags: [] },
      { id: 'm7', husbandId: 'p9', wifeId: 'p15', start: { y: 1990 }, endReason: 'Ongoing', ...v('Unconfirmed', 'Low'), flags: [] },
      { id: 'm8', husbandId: 'p20', wifeId: 'p21', start: { y: 1918, approx: true }, end: { y: 1960 }, endReason: 'DeathOfHusband', ...v('OralAccount', 'Low'), flags: [] },
    ],
    claims: [
      { id: 'c1', childId: 'p3', marriageId: 'm1', preferred: true, ...v('Verified', 'High'), flags: [] },
      { id: 'c2', childId: 'p7', marriageId: 'm2', preferred: true, ...v('Verified', 'High'), flags: [] },
      { id: 'c3', childId: 'p8', marriageId: 'm2', preferred: true, ...v('Verified', 'High'), flags: [] },
      { id: 'c4', childId: 'p9', marriageId: 'm3', preferred: true, ...v('OralAccount', 'Medium'), flags: [] },
      { id: 'c5', childId: 'p10', marriageId: 'm3', preferred: true, ...v('OralAccount', 'Medium'), flags: [] },
      { id: 'c6', childId: 'p11', marriageId: 'm4', preferred: true, ...v('Disputed', 'Medium'), flags: [] },
      { id: 'c7', childId: 'p11', marriageId: 'm3', preferred: false, ...v('Disputed', 'Low'), flags: [] },
      { id: 'c8', childId: 'p15', marriageId: 'm5', preferred: true, ...v('Verified', 'High'), flags: [] },
      { id: 'c9', childId: 'p16', marriageId: 'm6', preferred: true, ...v('Verified', 'High'), flags: [] },
      { id: 'c10', childId: 'p17', marriageId: 'm7', preferred: true, ...v('Unconfirmed', 'Medium'), flags: [] },
      { id: 'c11', childId: 'p18', marriageId: 'm7', preferred: true, ...v('Unconfirmed', 'Medium'), flags: [] },
      { id: 'c12', childId: 'p12', marriageId: 'm8', preferred: true, ...v('OralAccount', 'Low'), flags: [] },
    ],
    links: [
      { id: 'k1', kind: 'Guardianship', personId: 'p19', relatedPersonId: 'p3', ...v('OralAccount', 'Medium') },
      { id: 'k2', kind: 'MilkMother', personId: 'p16', relatedPersonId: 'p4', ...v('Unconfirmed', 'Low') },
    ],
    sources: [
      { id: 's1', type: 'Document', title: 'Marriage contract of Hamid and Aminah (fictional)', author: 'Demo court registry' },
      { id: 's2', type: 'OralAccount', title: 'Interview with Umm Ali (fictional)', narratorName: 'Umm Ali', toldOn: { y: 2019, m: 8 }, recordedBy: 'Demo admin' },
      { id: 's3', type: 'Gravestone', title: 'Gravestone of Salim (fictional)' },
      { id: 's4', type: 'OfficialRecord', title: 'Family register page 12 (fictional)' },
    ],
    citations: [
      { id: 'ci1', sourceId: 's1', target: { kind: 'marriage', id: 'm2' }, detail: 'p. 1' },
      { id: 'ci2', sourceId: 's2', target: { kind: 'marriage', id: 'm3' }, quotation: 'Hamid married Khadijah the year the well was dug.' },
      { id: 'ci3', sourceId: 's2', target: { kind: 'claim', id: 'c7' }, quotation: 'Hasan was nursed and raised as Khadijah’s son.' },
      { id: 'ci4', sourceId: 's3', target: { kind: 'marriage', id: 'm1' } },
      { id: 'ci5', sourceId: 's4', target: { kind: 'claim', id: 'c1' }, detail: 'row 3' },
      { id: 'ci6', sourceId: 's4', target: { kind: 'claim', id: 'c2' }, detail: 'row 7' },
      { id: 'ci7', sourceId: 's4', target: { kind: 'claim', id: 'c3' }, detail: 'row 8' },
      { id: 'ci8', sourceId: 's4', target: { kind: 'marriage', id: 'm5' }, detail: 'row 14' },
      { id: 'ci9', sourceId: 's4', target: { kind: 'marriage', id: 'm6' }, detail: 'row 15' },
      { id: 'ci10', sourceId: 's4', target: { kind: 'claim', id: 'c8' }, detail: 'row 16' },
      { id: 'ci11', sourceId: 's4', target: { kind: 'claim', id: 'c9' }, detail: 'row 17' },
    ],
    branches: [
      { id: 'b1', nameAr: 'ذرية حامد من آمنة', nameEn: 'Hamid through Aminah', rootMarriageId: 'm2', color: '#2f7d6d' },
      { id: 'b2', nameAr: 'ذرية حامد من خديجة', nameEn: 'Hamid through Khadijah', rootMarriageId: 'm3', color: '#8a5a1f' },
    ],
  }
}
