

# Phase 1: Stop-the-Bleeding Stabilization

## Overview
Fix the 5 highest-priority confirmed bugs from the audit without restructuring the app.

---

## Fix 1: class_id Resolution
**File:** `src/pages/Drill.tsx` (line 135)

Change `.eq('id', user.id)` → `.eq('user_id', user.id)` in the `fetchClassId` effect. Add a visible error toast if no student record is found so the failure is not silent.

---

## Fix 2: Add class_id to All Blocked Writes

### 2a: `saveAttemptToDatabase` (Drill.tsx ~line 489)
Add `class_id: classId` to the insert object. Guard: if `classId` is empty, log error and skip the write.

### 2b: `saveBRResults` (Drill.tsx ~line 1455)
Replace `(user as any).user_metadata?.class_id || user.id` with the component's `classId` state variable.

### 2c: `flagged_questions` insert (Drill.tsx ~line 1209)
Add `class_id: classId` to the insert. Remove the `as any` cast.

### 2d: `wajService.ts` — WAJ table has no `user_id` column
The `wrong_answer_journal` table uses `class_id` for RLS, not `user_id`. The service currently queries/inserts with `user_id` which doesn't exist in the schema. Fix: change the parameter from `user_id` to `class_id`, update all `.eq('user_id', ...)` to `.eq('class_id', ...)`, and update callers in Drill.tsx to pass `classId` instead of `user?.id`.

### 2e: `handleWAJSave` caller (Drill.tsx ~line 531)
Pass `class_id: classId` instead of `user_id: user?.id`.

---

## Fix 3: Conditional Hook Bug
**File:** `src/pages/Drill.tsx` (line 122)

Replace `const timer = hasTimer ? useTimerContext() : null;` with a safe wrapper hook that always calls `useContext` but returns `null` when no provider is present, avoiding the Rules of Hooks violation. Create a small `useTimerContextSafe()` hook.

---

## Fix 4: Adaptive Question Reselection Bug
**File:** `src/pages/Drill.tsx` (lines 280-344, 932-937)

The `useEffect([session])` at line 280 re-selects the adaptive question on ANY `setSession()` call. Fix by introducing an `advanceToken` counter:
- Add `const [advanceToken, setAdvanceToken] = React.useState(0);`
- For adaptive mode in the useEffect, only run question selection when `advanceToken` changes (not on every session change)
- `handleNext` for adaptive calls `setAdvanceToken(t => t + 1)` instead of `setSession({ ...session })`
- Split the useEffect: non-adaptive mode still triggers on `session.currentIndex`, adaptive triggers on `advanceToken`

---

## Fix 5: NodeJS.Timeout Build Errors
**Files:** `LoginIntro.tsx`, `EnhancedBlindReview.tsx`, `VoiceCoachModal.tsx`, `Drill.tsx`

Replace all `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` — the correct browser-compatible type.

---

## Fix 6: Minimal Guards
- In `saveAttemptToDatabase`, if `classId` is falsy, show `toast.error('Session error: missing class ID')` and return early instead of silently failing
- In `saveBRResults`, same guard
- In `handleWAJSave`, same guard

---

## Files Changed (summary)
| File | Changes |
|------|---------|
| `src/pages/Drill.tsx` | Fix class_id query, add class_id to inserts, fix conditional hook, fix adaptive reselection, fix NodeJS.Timeout type |
| `src/lib/wajService.ts` | Replace user_id with class_id throughout |
| `src/components/LoginIntro.tsx` | Fix NodeJS.Timeout type |
| `src/components/drill/EnhancedBlindReview.tsx` | Fix NodeJS.Timeout type |
| `src/components/drill/VoiceCoachModal.tsx` | Fix NodeJS.Timeout type |
| `src/contexts/TimerContext.tsx` | Export a `useTimerContextSafe` hook |

## Audit Issues Resolved
1. ✅ #1 RLS blocks attempt inserts
2. ✅ #2 class_id fetch uses wrong column
3. ✅ #3 Adaptive auto-advances on session change
4. ✅ #4 Conditional hook call
5. ✅ #5 saveAttemptToDatabase missing class_id
6. ✅ #6 saveBRResults uses wrong class_id
7. ✅ #9 flagged_questions insert uses `as any`
8. ✅ Build errors (NodeJS.Timeout)

## Issues Remaining for Rebuild Phase
- #7 UserSettings localStorage-only (needs sync with DB)
- #8 getAnswerGroups fallback hides bugs
- #10 Multiple setSession spread copies lose Map data
- #11 Dead BR flow code
- #13 handleSubmit stale closure
- #16 adaptiveEngine singleton state

