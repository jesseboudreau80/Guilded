# Guilded — Known Limitations (Beta 1.0)

This document is for internal use and beta testers.  
It honestly describes current limitations and their workarounds.

---

## 🔴 Critical Limitations (Know Before Inviting Users)

### Image-Only PDFs Not Supported
**Impact:** High — affects users who scan paper reports  
**Behavior:** Upload succeeds, 0 accounts extracted, user sees empty verification screen  
**Workaround:** Instruct users to download a digital PDF from AnnualCreditReport.com  
**Fix timeline:** Requires OCR (Tesseract/AWS Textract) integration — planned post-beta  

### No Password Reset
**Impact:** High — users who forget password are locked out  
**Behavior:** No "forgot password" link on login  
**Workaround:** Admin can manually delete + re-create account, or user registers with new email  
**Fix timeline:** Requires token endpoint + email flow — Phase 4  

### No Email Verification
**Impact:** Medium (low for invited beta)  
**Behavior:** Accounts activate immediately without email confirmation  
**Workaround:** Acceptable for personally-invited beta cohort  
**Fix timeline:** Phase 4  

---

## 🟡 Moderate Limitations

### AI Session Memory
**Impact:** Medium  
**Behavior:** Guild Counsel has no memory between sessions. Each new session starts fresh.  
**Workaround:** Users can copy useful advice from previous sessions  
**Fix timeline:** Requires server-side conversation storage — Phase 5  

### Streak Counter Accuracy
**Impact:** Low  
**Behavior:** Streak is computed from last 10 XP events only. Streaks > 10 consecutive days may undercount.  
**Workaround:** Accurate for typical beta usage (< 10 actions per day)  
**Fix timeline:** Add server-side streak endpoint — Phase 4  

### Billing Portal Link
**Impact:** Low  
**Behavior:** Account page shows subscription status but no self-serve payment update link  
**Workaround:** Users contact support to update payment method  
**Fix timeline:** Stripe Customer Portal API integration — Phase 4  

### Mission Completion Not Persisted
**Impact:** Low  
**Behavior:** Daily mission checkboxes reset on page refresh (visual only)  
**Note:** Actual progress (modules, audits, XP) persists correctly  
**Fix timeline:** Phase 4  

---

## 🟢 Minor Limitations (Cosmetic)

### OCR Account Numbers
Extracted account numbers show as `•F456` (last 4 chars of internal ID), not the real account number. The extraction prompt requests account numbers but they're often not present in standard bureau PDFs.

### Streak Reset on Sunday
The streak computation uses UTC timestamps. Users in timezones far from UTC may see unexpected streak resets.

### No Multi-Bureau Simultaneous Filing
Dispute letters are generated one strategy at a time. Users must generate separate letters for different strategies (e.g., one validation + one goodwill).

---

## 🔵 Out of Scope for Beta

These features are not planned for the closed beta:

- Password reset via email
- Email verification
- Dispute response tracking (bureau responses)
- CFPB complaint generator
- Debt statute-of-limitations calculator
- Score impact prediction
- Mobile app
- Multi-user accounts

---

## 📞 For Beta Testers

If you encounter an issue not listed here:

1. Use the **"Report"** button in the top navigation bar
2. Or email **support@guilded.finance** with:
   - What you were trying to do
   - What happened instead
   - Your browser and device type
   - Optional: screenshot

All beta feedback is reviewed directly by the founding team.
