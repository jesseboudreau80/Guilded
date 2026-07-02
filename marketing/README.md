# Guilded Marketing Content System

Content export structure for the DIY Credit Repair 101 launch campaign.

## Directory Structure

```
marketing/
├── captions/          Short-form post copy (Facebook, Instagram)
├── campaigns/         Full launch sequences (post-by-post plans)
├── educational/       Statute explainers, "did you know?" content
├── founder/           Jesse's personal story angles and framing
├── carousel/          Slide-by-slide carousel scripts
└── launch/            Launch day assets and timing plans
```

## Screenshot Targets

Take screenshots from these routes at 1440px wide (desktop) and 390px (mobile):

| Route                    | Best for                                 |
|--------------------------|------------------------------------------|
| `/preview`               | Full overview — hero use case            |
| `/preview/dashboard`     | Command center / "at a glance" posts     |
| `/preview/results`       | Risk score + recommendations closeup     |
| `/preview/academy`       | Module timeline — educational framing    |
| `/preview/journey`       | Milestone progress — XP / rank posts     |
| `/preview/mobile`        | Phone frame mockups for Facebook posts   |
| `/preview/social`        | Individual social cards — crop + post    |

## Social Card Capture (from `/preview/social`)

Each card is 320px wide, designed for 2× screenshot capture.
Cards available:
- XP Milestone (square 1:1)
- Audit Completion (square 1:1)
- Module Completed (square 1:1)
- Recovery Journey (4:5 portrait)
- FDCPA §809(b) explainer
- FCRA §611 explainer
- Dispute Strategy card
- Founder Story card
- Transparency card

## Capture instructions

1. Open `/preview/social` in browser at 100% zoom
2. Right-click any card → "Inspect" → find the card's root div
3. Right-click in DevTools → "Capture node screenshot" → saves at 2× resolution
4. OR: use browser screenshot extension set to 2× device pixel ratio

## Content tone rules (do not deviate)

- Never: "fast", "easy", "guaranteed", "skyrocket your score"
- Always: cite specific statutes (FCRA §611, FDCPA §809(b))
- Always: include educational disclaimer on posts that discuss strategy
- Always: "not legal advice" when discussing consumer law application
- Frame: educational-first, community-first, transparent about limitations
