# Quickstart: Islamic Family Tree — Core

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

1. Register, create tree "Test Family" — you are Owner.
2. Type "Abdullah" ⏎ (male). Type "Aminah", "Khadijah", "Sawdah", "Zaynab", "Hafsah" ⏎ (female).
3. Drag each of the first four women onto Abdullah, start dates 2000, 2002, 2004, 2006 → 4 union nodes appear.
4. Drag Hafsah onto Abdullah with start 2008 → **refused**: "A man may not have more than four wives at the same time."
5. Edit the Aminah marriage: end 2007, reason Divorce. Retry Hafsah 2008 → **saved**.
6. Type "Yusuf" (male), drag Aminah onto Yusuf with start 2007-06 → **warning** IDDAH_OVERLAP → confirm → saved, flag shown.
7. Drag Yusuf onto Aminah again with start 2010 while 2007 marriage ongoing → refused (she already has a husband).
8. Add two children under the Abdullah–Khadijah union and one under Abdullah–Sawdah → children sit under different unions.
9. Quick entry: `Ali ibn Abdullah ibn Hashim` → choose existing "Abdullah", new "Ali" and "Hashim" → chain created.
10. Press Ctrl+Z three times → last three actions undone; Ctrl+Y redoes.
11. Settings → Visibility: Public. Open the tree in a private browser window → living people show "Living person".

## 6. Verify on mobile

Sign in as an invited Member whose membership is linked to "Ali". The landing screen shows Ali's ancestor
chain (Ali ← Abdullah ← Hashim) with Abdullah's wives listed, and searching "عبد الله" or "abdullah" finds him.

## 7. Automated tests

```powershell
cd backend; dotnet test             # domain unit tests + API integration tests (Testcontainers PostgreSQL)
npm test -w packages/shared         # normaliser, nasab formatter, layout
npm test -w web                     # editor interaction tests (Vitest + Testing Library)
```
