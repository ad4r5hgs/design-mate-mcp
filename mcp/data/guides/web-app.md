# Web App / Dashboard Design Guide

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
```
┌──────────┬────────────────────────────────┐
│          │                                │
│ Sidebar  │     Main Content Area          │
│  240px   │      width: "fill"             │
│          │                                │
└──────────┴────────────────────────────────┘
```
```json
[
  { "type": "frame", "layout": "horizontal", "width": 240, "fill": "#0f172a",
    "padding": [16, 12], "gap": 4, "children": [ /* sidebar items */ ] },
  { "type": "frame", "layout": "vertical", "width": "fill", "fill": "#f8fafc",
    "padding": 32, "gap": 24, "children": [ /* main content */ ] }
]
```

### Pattern B: Header + Content
```
┌────────────────────────────────────────────┐
│              Header Bar (64px)             │
├────────────────────────────────────────────┤
│                                            │
│            Content Area                    │
│                                            │
└────────────────────────────────────────────┘
```

### Pattern C: Card Grid (Metrics)
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Metric 1 │ │ Metric 2 │ │ Metric 3 │ │ Metric 4 │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```
Parent: layout: "horizontal", gap: 16, children each width: "fill"

---

## Component Patterns

### Metric Card
```json
{ "type": "frame", "layout": "vertical", "width": "fill", "padding": 24, "gap": 8,
  "fill": "#ffffff", "cornerRadius": 12, "borderWidth": 1, "borderColor": "#e2e8f0",
  "boxShadow": "0 1px 3px rgba(0,0,0,0.08)",
  "children": [
    { "type": "text", "content": "Total Users", "fontSize": 13, "color": "#64748b" },
    { "type": "text", "content": "12,543", "fontSize": 32, "fontWeight": "bold", "color": "#0f172a" }
  ] }
```

### Sidebar Item (Active)
```json
{ "type": "frame", "layout": "horizontal", "padding": [10, 16], "gap": 12,
  "cornerRadius": 8, "fill": "rgba(99,102,241,0.1)", "alignItems": "center", "borderWidth": 0,
  "children": [
    { "type": "icon", "iconName": "bar-chart", "width": 16, "iconColor": "#6366f1" },
    { "type": "text", "content": "Dashboard", "fontSize": 14, "fontWeight": "500", "color": "#6366f1" }
  ] }
```

### Input Field
```json
{ "type": "frame", "layout": "vertical", "gap": 6, "borderWidth": 0,
  "children": [
    { "type": "text", "content": "Email", "fontSize": 13, "fontWeight": "500", "color": "#374151" },
    { "type": "frame", "padding": [10, 14], "cornerRadius": 8, "fill": "#ffffff",
      "borderWidth": 1, "borderColor": "#d1d5db",
      "children": [
        { "type": "text", "content": "Enter your email", "fontSize": 14, "color": "#9ca3af" }
      ] }
  ] }
```

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
