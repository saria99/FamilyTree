# Quickstart: Bayrab Genealogy — Core Platform

How to run everything locally and verify the core rules end-to-end.

## Prerequisites

- .NET SDK 10 (`dotnet --list-sdks` shows 10.0.x)
- Node.js 24 + npm
- Docker Desktop (for PostgreSQL and Testcontainers)
- For mobile: Expo Go app on a phone, or an Android emulator / iOS simulator

## 1. Start PostgreSQL

```powershell
docker compose up -d db          # PostgreSQL 17 on localhost:5432, db=familytree, user=familytree
```

Files (attachments, photos, exports) are stored under `backend/.data/files` by default (`FileStore:Root`).

## 2. Run the API

```powershell
cd backend
dotnet ef database update --project src/FamilyTree.Infrastructure --startup-project src/FamilyTree.Api
dotnet run --project src/FamilyTree.Api     # http://localhost:5080, OpenAPI at /openapi/v1.json
```

Seed demo data (optional): `dotnet run --project src/FamilyTree.Api -- seed-demo`

## 3. Generate shared types and run the web admin editor

```powershell
npm install                       # at repo root (npm workspaces)
npm run gen:api -w packages/shared  # pulls http://localhost:5080/openapi/v1.json → src/api/schema.d.ts
npm run dev -w web                # http://localhost:5173
```

## 4. Run the mobile viewer

```powershell
npm run start -w mobile           # scan the QR code with Expo Go
```

Set `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:5080/api/v1` in `mobile/.env` so the phone can reach the API.

## 5. Verify the core scenarios (manual, web editor)

1. Register, create tree "Test Family" with ID prefix `TST` — you are Owner. New people get `TST-000001`, `TST-000002`, …
2. Type "Abdullah" ⏎ (male). Type "Aminah", "Khadijah", "Sawdah", "Zaynab", "Hafsah" ⏎ (female).
3. Drag each of the first four women onto Abdullah, start dates 2000, 2002, 2004, 2006 → 4 union nodes appear.
4. Drag Hafsah onto Abdullah with start 2008 → **refused**: "A man may not have more than four wives at the same time."
5. Edit the Aminah marriage: end 2007-03-01, reason Divorce (revocable). Retry Hafsah with start 2007-04-01 → **warning**
   FIFTH_WIFE_DURING_IDDAH (Aminah's iddah runs to ~2007-05-30) → cancel. Retry with start 2008 → **saved** without warning.
6. Type "Yusuf" (male), drag Aminah onto Yusuf with start 2007-06 → **warning** IDDAH_OVERLAP → confirm → saved, flag shown.
7. Drag Yusuf onto Aminah again with start 2010 while 2007 marriage ongoing → refused (she already has a husband).
8. Add two children under the Abdullah–Khadijah union and one under Abdullah–Sawdah → children sit under different unions.
9. Quick entry: `Ali ibn Abdullah ibn Hashim` → choose existing "Abdullah", new "Ali" and "Hashim" → chain created.
10. Press Ctrl+Z three times → last three actions undone; Ctrl+Y redoes.
11. Settings → Visibility: Public. Open the tree in a private browser window → living people show "Living person".

### Evidence, claims, branches, outputs

12. Select the Abdullah–Khadijah marriage and set status **Verified** → **refused** (VERIFIED_REQUIRES_SOURCE: no citation yet).
13. Sources → New: type Oral account, narrator "Umm Ali", told 1440 AH, recorded by you. Cite it on that marriage and set
    status **Oral account**, confidence Medium → the edge turns long-dashed with an "Oral" badge.
14. Drag one of Khadijah's children onto the Abdullah–Sawdah union → dialog "Already has preferred parents — add as
    alternative claim?" → yes → both claims Disputed; the alternative shows as a red dotted edge. Make the alternative
    preferred → the child moves under Sawdah; history shows one change.
15. Branches → New "Through Khadijah" rooted at the Abdullah–Khadijah marriage → filter canvas → only her descendants.
16. Export → PDF → Descendant chart, branch "Through Khadijah", Arabic, A3 → download within seconds; check the RTL text,
    the status legend and the line styles.
17. Export → Excel → open the file → sheets People/Marriages/Parentage/Kinship/Sources/Citations with `TST-…` IDs and statuses.
    Edit two names, add one child row, re-import → preview shows 2 Update + 1 New → Commit → history shows one import operation.
18. Research queue → filter "No source" → lists every Unconfirmed relationship.

## 6. Verify on mobile

Sign in as an invited Member whose membership is linked to "Ali". The landing screen shows Ali's ancestor
chain (Ali ← Abdullah ← Hashim) with Abdullah's wives listed and each link's status badge; "Maternal line" lists his
mothers; searching "عبد الله", "abdullah" or "TST-000001" finds him; the tree tab shows the status legend.

## 7. Automated tests

```powershell
cd backend; dotnet test             # domain unit tests + API integration tests (Testcontainers PostgreSQL)
npm test -w packages/shared         # normaliser, nasab formatter, layout
npm test -w web                     # editor interaction tests (Vitest + Testing Library)
```
