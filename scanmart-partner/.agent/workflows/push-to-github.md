---
description: Push changed files to GitHub (kuldeeppanwar02/scanmart-partner)
---

# Push Changes to GitHub

## Prerequisites (One-Time Setup)
Git root is at `d:\ScanMart App\` (parent of scanmart-partner).
GitHub repo structure: code is inside `scanmart-partner/` subfolder at root of repo.

## Steps

// turbo
1. Check git status from parent folder
```powershell
git -C "d:\ScanMart App" status
```

// turbo
2. Stage only the changed files (replace filenames as needed)
```powershell
git -C "d:\ScanMart App" add scanmart-partner/app/dashboard/suppliers/page.tsx scanmart-partner/app/dashboard/sales/page.tsx
```

// turbo
3. Commit with a descriptive message
```powershell
git -C "d:\ScanMart App" commit -m "fix: <describe changes here>"
```

// turbo
4. Push to GitHub main branch
```powershell
git -C "d:\ScanMart App" push origin HEAD:main
```
