/**
 * Design Guide Content — Embedded reference guides for AI agents.
 *
 * Two guides are available:
 * - "landing-page": Marketing pages, hero sections, conversion-focused layouts
 * - "web-app": Dashboards, admin panels, SaaS product UIs
 *
 * @module data/design-guides
 */

export const DESIGN_GUIDES: Record<string, string> = {
  "landing-page": `# Landing Page Design Guide

You are a world-class marketing designer. Your purpose: sell the product through design.

## Pre-Design Workflow (Mandatory)

Before designing, ensure clarity on:
1. **Product**: What it is, what problem it solves
2. **Audience**: Who this is for
3. **Goal**: Primary conversion (sign up / demo / waitlist / purchase)
4. **Value prop**: What's different/better, top 3-5 benefits
5. **Brand & tone**: Personality, colors, constraints

If anything is unclear → ask. Do not guess.

---

## Page Structure

1. **Header** — Logo, nav links, primary CTA button
2. **Hero** — Badge/label, headline, subheadline, CTAs, product visual
3. **Social Proof** — Trust logos, stats row, testimonials
4. **How It Works** — 3 step cards with icons/numbers
5. **Features** — 3-4 features with headlines + descriptions
6. **Pricing** — Tier cards with feature lists and CTAs
7. **FAQ** — Q&A addressing objections
8. **Final CTA** — Headline, subheadline, CTA, trust reassurance
9. **Footer** — Logo, nav columns, copyright

---

## Hero Section Rules

The hero compresses the entire product into one screen. If the visitor only sees this, they understand what it is.

- **One idea only.** No feature lists, no competing messages.
- **Headline**: Main promise/outcome. Must make sense standalone.
- **Subheadline**: What the product actually does. Practical, concrete.
- **CTA**: One primary action. Optional secondary with lower commitment.
- **Viewport**: Key content within ~700px height (above fold).

### Headline Hierarchy (strongest → weakest)
1. Transformation: "Finally feel in control of your inbox"
2. Outcome: "Ship more content, grow your audience"
3. Benefit: "Write 10x faster"
4. Feature: "AI-powered writing assistant"

Lead with transformation or outcome.

---

## Visual Guidelines

### Aesthetic Direction
Choose a BOLD direction and commit:
- **Typography**: Distinctive display font + refined body font. Never defaults.
- **Color**: Dominant colors with sharp accents. Cohesive palette. No timid even-distribution.
- **Backgrounds**: Create atmosphere — gradient meshes, geometric patterns, layered transparencies. Never default to flat solids.

### Section Theming
- Dark sections → credibility, depth, sophistication
- Light sections → explanation, detail, openness
- Alternate intentionally between dark and light

### Section Rhythm
Alternate text-heavy and visual sections. Never stack multiple text-only sections.

---

## Visual Effects (use these!)

### Box Shadows — Make surfaces feel real
\`\`\`
Subtle:   "0 1px 3px rgba(0,0,0,0.08)"     → borders/dividers
Card:     "0 4px 12px rgba(0,0,0,0.1)"      → cards, containers
Elevated: "0 8px 24px rgba(0,0,0,0.12)"     → modals, dropdowns
Float:    "0 12px 40px rgba(0,0,0,0.15)"    → hero elements
Glow:     "0 0 20px rgba(99,102,241,0.3)"   → accent glow (use brand color)
\`\`\`

### Gradients — Add depth and energy
\`\`\`
Hero bg:  "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0a0a1a 100%)"
Button:   "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
Accent:   "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)"
Glass:    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)"
\`\`\`

---

## Common Patterns

### Button
\`\`\`json
{ "type": "frame", "layout": "horizontal", "padding": [12, 24], "cornerRadius": 8,
  "fill": "#6366f1", "alignItems": "center", "justifyContent": "center", "gap": 8,
  "boxShadow": "0 4px 12px rgba(99,102,241,0.3)",
  "children": [{ "type": "text", "content": "Get Started", "fontSize": 15, "fontWeight": "600", "color": "#ffffff" }] }
\`\`\`

### Card with Shadow
\`\`\`json
{ "type": "frame", "layout": "vertical", "padding": 24, "cornerRadius": 16,
  "fill": "#ffffff", "borderWidth": 1, "borderColor": "#e2e8f0", "gap": 12,
  "boxShadow": "0 4px 12px rgba(0,0,0,0.08)",
  "children": [
    { "type": "text", "content": "Card Title", "fontSize": 20, "fontWeight": "600", "color": "#0f172a" },
    { "type": "text", "content": "Description text here", "fontSize": 14, "color": "#64748b" }
  ] }
\`\`\`

### Dark Hero Background
\`\`\`json
{ "type": "frame", "layout": "vertical", "width": 1200, "height": 600,
  "fill": "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0a0a1a 100%)",
  "padding": [80, 120], "alignItems": "center", "gap": 24, "borderWidth": 0,
  "children": [ ... ] }
\`\`\`

---

## Anti-Slop Rules (Mandatory)

Never converge toward generic AI aesthetics:
- No flat solid backgrounds — create atmosphere with gradients
- No predictable layouts or boilerplate card patterns
- Use boxShadow to add depth to every card and elevated element
- Commit to a cohesive theme — don't mix styles randomly
- Short confident sentences. No fluff. No jargon.

---

## Spacing Reference

| Context | Gap | Padding |
|---------|-----|---------|
| Screen sections | 0 (use y-anchors) | [48-80, 80-120] |
| Card grid (horizontal) | 16-24 | — |
| Inside cards | 12-16 | 24 |
| Inside buttons | — | [12, 24] |
| Inside inputs | — | [12, 14] |
| Form fields (vertical) | 16 | — |
| Button groups (horiz) | 12 | — |
| Nav links (horizontal) | 24-32 | — |

---

## Layout Patterns

### Full-width Section
\`\`\`
┌──────────────────────────────────────────────┐
│              Section (1200×auto)              │
│  padding: [48-80, 80-120]                    │
│  ┌─────────────────────────────────────────┐ │
│  │ Content (centered text, cards, etc.)    │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
\`\`\`

### Two-Column Hero
\`\`\`
┌──────────────────────────────────────────────┐
│  ┌────────────────┐  ┌────────────────────┐  │
│  │  Text Column   │  │  Visual Column     │  │
│  │  width: "fill" │  │  width: "fill"     │  │
│  │  (headline,    │  │  (screenshot,      │  │
│  │   sub, CTAs)   │  │   illustration)    │  │
│  └────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────┘
\`\`\`

### 3-Column Card Grid
\`\`\`
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Card 1   │  │  Card 2   │  │  Card 3   │
│ width:fill│  │ width:fill│  │ width:fill│
│ shadow: y │  │ shadow: y │  │ shadow: y │
└───────────┘  └───────────┘  └───────────┘
gap: 24, parent: layout: "horizontal"
\`\`\`
`,

  "web-app": `# Web App / Dashboard Design Guide

You are designing a functional product UI. Structure emerges from utility, not decoration.

---

## Core Principles

1. **Purpose First** — Every screen answers one dominant user question, supports one primary action
2. **Dominant Region** — One visual region has the most weight. Avoid equal-weight layouts.
3. **Progressive Disclosure** — Show essentials first. Advanced controls are contextual.
4. **Action Hierarchy** — One primary action per section. Secondary actions visually reduced.
5. **Structural Consistency** — Similar problems → similar solutions. Spacing follows a consistent scale.

---

## Layout Patterns

### Pattern A: Sidebar + Content (Dashboard)
\`\`\`
┌──────────┬────────────────────────────────┐
│          │                                │
│ Sidebar  │     Main Content Area          │
│  240px   │      width: "fill"             │
│          │                                │
└──────────┴────────────────────────────────┘
\`\`\`
\`\`\`json
[
  { "type": "frame", "layout": "horizontal", "width": 240, "fill": "#0f172a",
    "padding": [16, 12], "gap": 4, "children": [ /* sidebar items */ ] },
  { "type": "frame", "layout": "vertical", "width": "fill", "fill": "#f8fafc",
    "padding": 32, "gap": 24, "children": [ /* main content */ ] }
]
\`\`\`

### Pattern B: Header + Content
\`\`\`
┌────────────────────────────────────────────┐
│              Header Bar (64px)             │
├────────────────────────────────────────────┤
│                                            │
│            Content Area                    │
│                                            │
└────────────────────────────────────────────┘
\`\`\`

### Pattern C: Card Grid (Metrics)
\`\`\`
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Metric 1 │ │ Metric 2 │ │ Metric 3 │ │ Metric 4 │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
\`\`\`
Parent: layout: "horizontal", gap: 16, children each width: "fill"

---

## Component Patterns

### Metric Card
\`\`\`json
{ "type": "frame", "layout": "vertical", "width": "fill", "padding": 24, "gap": 8,
  "fill": "#ffffff", "cornerRadius": 12, "borderWidth": 1, "borderColor": "#e2e8f0",
  "boxShadow": "0 1px 3px rgba(0,0,0,0.08)",
  "children": [
    { "type": "text", "content": "Total Users", "fontSize": 13, "color": "#64748b" },
    { "type": "text", "content": "12,543", "fontSize": 32, "fontWeight": "bold", "color": "#0f172a" }
  ] }
\`\`\`

### Sidebar Item (Active)
\`\`\`json
{ "type": "frame", "layout": "horizontal", "padding": [10, 16], "gap": 12,
  "cornerRadius": 8, "fill": "rgba(99,102,241,0.1)", "alignItems": "center", "borderWidth": 0,
  "children": [
    { "type": "icon", "iconName": "bar-chart", "width": 16, "iconColor": "#6366f1" },
    { "type": "text", "content": "Dashboard", "fontSize": 14, "fontWeight": "500", "color": "#6366f1" }
  ] }
\`\`\`

### Input Field
\`\`\`json
{ "type": "frame", "layout": "vertical", "gap": 6, "borderWidth": 0,
  "children": [
    { "type": "text", "content": "Email", "fontSize": 13, "fontWeight": "500", "color": "#374151" },
    { "type": "frame", "padding": [10, 14], "cornerRadius": 8, "fill": "#ffffff",
      "borderWidth": 1, "borderColor": "#d1d5db",
      "children": [
        { "type": "text", "content": "Enter your email", "fontSize": 14, "color": "#9ca3af" }
      ] }
  ] }
\`\`\`

---

## Visual Effects for Dashboards

Dashboards should feel clean and structured:
- **Cards**: Always use boxShadow: "0 1px 3px rgba(0,0,0,0.08)" at minimum
- **Sidebar**: Dark fill (#0f172a or #111827) with light text
- **Active states**: Subtle background tint (rgba of brand color at 10%)
- **Dividers**: Use border instead of separate elements. borderWidth: 1, borderColor: "#e2e8f0"

---

## Spacing Reference

| Context | Gap | Padding |
|---------|-----|---------|
| Page sections | 24-32 | 32 |
| Card grid | 16-24 | — |
| Inside cards | 8-12 | 24 |
| Form fields (vertical) | 16 | — |
| Form row (horizontal) | 16 | — |
| Button groups | 12 | — |
| Inside buttons | — | [10, 16] |
| Inside inputs | — | [10, 14] |
| Sidebar items | 4 | [10, 16] |

---

## Button Hierarchy

| Priority | Style | Use For |
|----------|-------|---------|
| 1. Primary | fill: brand color + boxShadow | Main action (Save, Submit, Create) |
| 2. Secondary | fill: "#f1f5f9", text: dark | Alternative actions |
| 3. Outline | borderWidth: 1, fill: transparent | Tertiary, Cancel, Back |
| 4. Ghost | fill: transparent, no border | Inline actions, navigation |
| 5. Destructive | fill: "#ef4444" | Delete, Remove |

Right-align action buttons in cards and modals. One primary per section.

---

## Anti-Patterns

- [x]No multi-purpose cluttered screens — one purpose per screen
- [x]Don't give equal emphasis to all actions — hierarchy is mandatory
- [x]Don't mix density modes within one screen
- [x]No decorative dividers unless functionally needed
- [x]No silent states — always show loading, empty, error states
`,
};
