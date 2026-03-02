/**
 * Component Library — Reusable UI Component Templates
 *
 * Each component is a PenNode tree that can be referenced via { type: "ref", ref: "Button/Primary" }.
 * The layout engine resolves refs by deep-cloning the template and merging user overrides.
 */

import { PenNode } from "./layout-engine";

// ─── Component Registry ──────────────────────────────────────────────────────

export interface ComponentDef {
    name: string;
    description: string;
    category: string;
    /** Override-able prop names with descriptions */
    overrides: Record<string, string>;
    /** The PenNode template tree */
    template: PenNode;
}

const COMPONENTS: Record<string, ComponentDef> = {};

function register(def: ComponentDef) {
    COMPONENTS[def.name] = def;
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

register({
    name: "Button/Primary",
    description: "Primary CTA button with brand color fill and shadow",
    category: "Buttons",
    overrides: {
        label: "Button text (default: 'Get Started')",
        fill: "Background color (default: '#6366f1')",
        cornerRadius: "Border radius (default: 8)",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [12, 24],
        cornerRadius: 8,
        fill: "#6366f1",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 0,
        boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
        children: [
            { type: "text", content: "Get Started", fontSize: 15, fontWeight: "600", color: "#ffffff" },
        ],
    },
});

register({
    name: "Button/Secondary",
    description: "Secondary button with subtle background",
    category: "Buttons",
    overrides: {
        label: "Button text (default: 'Learn More')",
        fill: "Background color (default: '#f1f5f9')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [12, 24],
        cornerRadius: 8,
        fill: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 0,
        children: [
            { type: "text", content: "Learn More", fontSize: 15, fontWeight: "500", color: "#334155" },
        ],
    },
});

register({
    name: "Button/Outline",
    description: "Outline button with border only, transparent fill",
    category: "Buttons",
    overrides: {
        label: "Button text (default: 'Cancel')",
        borderColor: "Border color (default: '#d1d5db')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [12, 24],
        cornerRadius: 8,
        fill: "transparent",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#d1d5db",
        children: [
            { type: "text", content: "Cancel", fontSize: 15, fontWeight: "500", color: "#374151" },
        ],
    },
});

register({
    name: "Button/Ghost",
    description: "Ghost button — text only, no background or border",
    category: "Buttons",
    overrides: {
        label: "Button text (default: 'Skip')",
        color: "Text color (default: '#6366f1')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [12, 24],
        cornerRadius: 8,
        fill: "transparent",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0,
        children: [
            { type: "text", content: "Skip", fontSize: 15, fontWeight: "500", color: "#6366f1" },
        ],
    },
});

register({
    name: "Button/Destructive",
    description: "Destructive/danger button with red fill",
    category: "Buttons",
    overrides: {
        label: "Button text (default: 'Delete')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [12, 24],
        cornerRadius: 8,
        fill: "#ef4444",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0,
        boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
        children: [
            { type: "text", content: "Delete", fontSize: 15, fontWeight: "600", color: "#ffffff" },
        ],
    },
});

// ─── Form Controls ───────────────────────────────────────────────────────────

register({
    name: "Input",
    description: "Text input field with label",
    category: "Form",
    overrides: {
        label: "Label text (default: 'Email')",
        placeholder: "Placeholder text (default: 'Enter your email')",
    },
    template: {
        type: "frame",
        layout: "vertical",
        gap: 6,
        borderWidth: 0,
        children: [
            { type: "text", content: "Email", fontSize: 13, fontWeight: "500", color: "#374151" },
            {
                type: "frame",
                layout: "horizontal",
                padding: [10, 14],
                cornerRadius: 8,
                fill: "#ffffff",
                borderWidth: 1,
                borderColor: "#d1d5db",
                alignItems: "center",
                children: [
                    { type: "text", content: "Enter your email", fontSize: 14, color: "#9ca3af" },
                ],
            },
        ],
    },
});

register({
    name: "Select",
    description: "Dropdown select with label and chevron indicator",
    category: "Form",
    overrides: {
        label: "Label text (default: 'Country')",
        placeholder: "Placeholder text (default: 'Select an option')",
    },
    template: {
        type: "frame",
        layout: "vertical",
        gap: 6,
        borderWidth: 0,
        children: [
            { type: "text", content: "Country", fontSize: 13, fontWeight: "500", color: "#374151" },
            {
                type: "frame",
                layout: "horizontal",
                padding: [10, 14],
                cornerRadius: 8,
                fill: "#ffffff",
                borderWidth: 1,
                borderColor: "#d1d5db",
                alignItems: "center",
                justifyContent: "space_between",
                children: [
                    { type: "text", content: "Select an option", fontSize: 14, color: "#9ca3af" },
                    { type: "text", content: "▾", fontSize: 14, color: "#6b7280" },
                ],
            },
        ],
    },
});

register({
    name: "Checkbox",
    description: "Checkbox with label",
    category: "Form",
    overrides: {
        label: "Label text (default: 'I agree to the terms')",
        checked: "Checked state (default: false)",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        gap: 10,
        alignItems: "center",
        borderWidth: 0,
        children: [
            {
                type: "frame",
                layout: "horizontal",
                width: 20,
                height: 20,
                cornerRadius: 4,
                fill: "#ffffff",
                borderWidth: 2,
                borderColor: "#d1d5db",
                alignItems: "center",
                justifyContent: "center",
                children: [],
            },
            { type: "text", content: "I agree to the terms", fontSize: 14, color: "#374151" },
        ],
    },
});

register({
    name: "Switch",
    description: "Toggle switch with label",
    category: "Form",
    overrides: {
        label: "Label text (default: 'Enable notifications')",
        on: "Active state (default: false)",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        gap: 12,
        alignItems: "center",
        borderWidth: 0,
        children: [
            {
                type: "frame",
                layout: "horizontal",
                width: 44,
                height: 24,
                cornerRadius: 999,
                fill: "#d1d5db",
                padding: [2, 2],
                alignItems: "center",
                borderWidth: 0,
                children: [
                    {
                        type: "frame",
                        width: 20,
                        height: 20,
                        cornerRadius: 999,
                        fill: "#ffffff",
                        borderWidth: 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    },
                ],
            },
            { type: "text", content: "Enable notifications", fontSize: 14, color: "#374151" },
        ],
    },
});

// ─── Display Components ──────────────────────────────────────────────────────

register({
    name: "Card",
    description: "Card container with title, description, and content area",
    category: "Display",
    overrides: {
        title: "Card title (default: 'Card Title')",
        description: "Card description (default: 'Card description goes here')",
    },
    template: {
        type: "frame",
        layout: "vertical",
        padding: 24,
        cornerRadius: 16,
        fill: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        gap: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        children: [
            { type: "text", content: "Card Title", fontSize: 20, fontWeight: "600", color: "#0f172a" },
            { type: "text", content: "Card description goes here", fontSize: 14, color: "#64748b", lineHeight: 1.5 },
        ],
    },
});

register({
    name: "Avatar",
    description: "Circular avatar with initials",
    category: "Display",
    overrides: {
        initials: "Initials text (default: 'JD')",
        fill: "Background color (default: '#6366f1')",
        size: "Size in px (default: 40)",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        width: 40,
        height: 40,
        cornerRadius: 999,
        fill: "#6366f1",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0,
        children: [
            { type: "text", content: "JD", fontSize: 14, fontWeight: "600", color: "#ffffff" },
        ],
    },
});

register({
    name: "Badge",
    description: "Small colored label/tag",
    category: "Display",
    overrides: {
        text: "Badge text (default: 'New')",
        variant: "'success' | 'warning' | 'error' | 'info' | 'default' (default: 'default')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [4, 10],
        cornerRadius: 999,
        fill: "#ede9fe",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0,
        children: [
            { type: "text", content: "New", fontSize: 12, fontWeight: "500", color: "#6366f1" },
        ],
    },
});

register({
    name: "Divider",
    description: "Horizontal line separator",
    category: "Display",
    overrides: {},
    template: {
        type: "frame",
        layout: "horizontal",
        width: "fill" as any,
        height: 1,
        fill: "#e2e8f0",
        borderWidth: 0,
    },
});

register({
    name: "Alert",
    description: "Alert/notification box with title and message",
    category: "Feedback",
    overrides: {
        title: "Alert title (default: 'Heads up!')",
        message: "Alert message",
        variant: "'info' | 'success' | 'warning' | 'error' (default: 'info')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: 16,
        cornerRadius: 12,
        fill: "#eff6ff",
        borderWidth: 1,
        borderColor: "#bfdbfe",
        gap: 12,
        alignItems: "start",
        children: [
            { type: "text", content: "ℹ", fontSize: 18 },
            {
                type: "frame",
                layout: "vertical",
                gap: 4,
                borderWidth: 0,
                children: [
                    { type: "text", content: "Heads up!", fontSize: 14, fontWeight: "600", color: "#1e40af" },
                    { type: "text", content: "This is an informational alert message.", fontSize: 13, color: "#1e40af", lineHeight: 1.5 },
                ],
            },
        ],
    },
});

// ─── Navigation Components ───────────────────────────────────────────────────

register({
    name: "SidebarItem",
    description: "Navigation sidebar item with optional icon",
    category: "Navigation",
    overrides: {
        label: "Item label (default: 'Dashboard')",
        icon: "Lucide icon name (default: 'bar-chart')",
        active: "Whether this item is active (default: false)",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [10, 16],
        gap: 12,
        cornerRadius: 8,
        fill: "transparent",
        alignItems: "center",
        borderWidth: 0,
        children: [
            { type: "icon", iconName: "bar-chart", width: 16, iconColor: "#94a3b8" } as any,
            { type: "text", content: "Dashboard", fontSize: 14, fontWeight: "400", color: "#94a3b8" },
        ],
    },
});

register({
    name: "SidebarItem/Active",
    description: "Active state navigation sidebar item (highlighted)",
    category: "Navigation",
    overrides: {
        label: "Item label (default: 'Dashboard')",
        icon: "Lucide icon name (default: 'bar-chart')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [10, 16],
        gap: 12,
        cornerRadius: 8,
        fill: "rgba(99,102,241,0.1)",
        alignItems: "center",
        borderWidth: 0,
        children: [
            { type: "icon", iconName: "bar-chart", width: 16, iconColor: "#6366f1" } as any,
            { type: "text", content: "Dashboard", fontSize: 14, fontWeight: "500", color: "#6366f1" },
        ],
    },
});

register({
    name: "Tab",
    description: "Tab button (inactive state)",
    category: "Navigation",
    overrides: {
        label: "Tab label (default: 'General')",
    },
    template: {
        type: "frame",
        layout: "horizontal",
        padding: [10, 20],
        cornerRadius: 0,
        fill: "transparent",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0,
        children: [
            { type: "text", content: "General", fontSize: 14, fontWeight: "400", color: "#64748b" },
        ],
    },
});

register({
    name: "Tab/Active",
    description: "Active tab button (with bottom border)",
    category: "Navigation",
    overrides: {
        label: "Tab label (default: 'General')",
    },
    template: {
        type: "frame",
        layout: "vertical",
        padding: [10, 20, 8, 20],
        cornerRadius: 0,
        fill: "transparent",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0,
        gap: 8,
        children: [
            { type: "text", content: "General", fontSize: 14, fontWeight: "600", color: "#6366f1" },
            { type: "frame", width: "fill" as any, height: 2, fill: "#6366f1", cornerRadius: 1, borderWidth: 0 },
        ],
    },
});

// ─── Public API ──────────────────────────────────────────────────────────────

/** Get a component template by name */
export function getComponent(name: string): ComponentDef | undefined {
    return COMPONENTS[name];
}

/** Get all component names grouped by category */
export function listComponents(): { name: string; description: string; category: string; overrides: Record<string, string> }[] {
    return Object.values(COMPONENTS).map(c => ({
        name: c.name,
        description: c.description,
        category: c.category,
        overrides: c.overrides,
    }));
}

/** Deep clone a PenNode, applying overrides */
export function resolveComponent(name: string, overrides?: Record<string, any>): PenNode | null {
    const def = COMPONENTS[name];
    if (!def) return null;

    // Deep clone the template
    const clone = JSON.parse(JSON.stringify(def.template)) as PenNode;

    if (!overrides) return clone;

    // Apply known overrides
    if (overrides.label && clone.children) {
        // Find first text child and update its content
        const textChild = findFirstText(clone);
        if (textChild) textChild.content = overrides.label;
    }
    if (overrides.placeholder && clone.children) {
        // For inputs — find second text child (placeholder)
        const texts = findAllTexts(clone);
        if (texts.length >= 2) texts[1].content = overrides.placeholder;
        else if (texts.length === 1) texts[0].content = overrides.placeholder;
    }
    if (overrides.title && clone.children) {
        const texts = findAllTexts(clone);
        if (texts.length >= 1) texts[0].content = overrides.title;
    }
    if (overrides.description && clone.children) {
        const texts = findAllTexts(clone);
        if (texts.length >= 2) texts[1].content = overrides.description;
    }
    if (overrides.message && clone.children) {
        const texts = findAllTexts(clone);
        if (texts.length >= 2) texts[texts.length - 1].content = overrides.message;
    }
    if (overrides.text && clone.children) {
        const textChild = findFirstText(clone);
        if (textChild) textChild.content = overrides.text;
    }
    if (overrides.initials && clone.children) {
        const textChild = findFirstText(clone);
        if (textChild) textChild.content = overrides.initials;
    }
    if (overrides.icon && clone.children) {
        // First text that looks like an icon (short, 1-2 chars)
        const texts = findAllTexts(clone);
        const iconText = texts.find(t => (t.content || "").length <= 2);
        if (iconText) iconText.content = overrides.icon;
    }

    // Apply style overrides directly
    if (overrides.fill) clone.fill = overrides.fill;
    if (overrides.cornerRadius !== undefined) clone.cornerRadius = overrides.cornerRadius;
    if (overrides.borderColor) clone.borderColor = overrides.borderColor;
    if (overrides.boxShadow) clone.boxShadow = overrides.boxShadow;
    if (overrides.width !== undefined) clone.width = overrides.width;
    if (overrides.height !== undefined) clone.height = overrides.height;

    // Active states
    if (overrides.active === true && name === "SidebarItem") {
        clone.fill = "rgba(99,102,241,0.1)";
        const texts = findAllTexts(clone);
        const label = texts.find(t => (t.content || "").length > 2);
        if (label) { label.fontWeight = "500"; label.color = "#6366f1"; }
    }
    if (overrides.checked === true && name === "Checkbox" && clone.children) {
        const box = clone.children[0];
        if (box && box.type === "frame") {
            box.fill = "#6366f1";
            box.borderColor = "#6366f1";
            box.children = [{ type: "text", content: "✓", fontSize: 12, fontWeight: "bold", color: "#ffffff" }];
        }
    }
    if (overrides.on === true && name === "Switch" && clone.children) {
        const track = clone.children[0];
        if (track && track.type === "frame") {
            track.fill = "#6366f1";
            track.justifyContent = "end";
        }
    }

    // Badge variants
    if (overrides.variant && name === "Badge") {
        const variants: Record<string, { bg: string; fg: string }> = {
            success: { bg: "#dcfce7", fg: "#15803d" },
            warning: { bg: "#fef3c7", fg: "#b45309" },
            error: { bg: "#fee2e2", fg: "#dc2626" },
            info: { bg: "#dbeafe", fg: "#2563eb" },
            default: { bg: "#ede9fe", fg: "#6366f1" },
        };
        const v = variants[overrides.variant] || variants.default;
        clone.fill = v.bg;
        const textChild = findFirstText(clone);
        if (textChild) textChild.color = v.fg;
    }

    // Alert variants
    if (overrides.variant && name === "Alert") {
        const variants: Record<string, { bg: string; border: string; fg: string; icon: string }> = {
            info: { bg: "#eff6ff", border: "#bfdbfe", fg: "#1e40af", icon: "i" },
            success: { bg: "#f0fdf4", border: "#bbf7d0", fg: "#15803d", icon: "ok" },
            warning: { bg: "#fffbeb", border: "#fde68a", fg: "#b45309", icon: "!" },
            error: { bg: "#fef2f2", border: "#fecaca", fg: "#dc2626", icon: "x" },
        };
        const v = variants[overrides.variant] || variants.info;
        clone.fill = v.bg;
        clone.borderColor = v.border;
        const texts = findAllTexts(clone);
        if (texts.length > 0) texts[0].content = v.icon;
        for (const t of texts.slice(1)) { t.color = v.fg; }
    }

    // Avatar size override
    if (overrides.size && name === "Avatar") {
        clone.width = overrides.size;
        clone.height = overrides.size;
        const textChild = findFirstText(clone);
        if (textChild) textChild.fontSize = Math.round(overrides.size * 0.35);
    }

    return clone;
}

/** Resolve all ref nodes in a PenNode tree in-place */
export function resolveRefs(node: PenNode): PenNode {
    if ((node as any).type === "ref" && (node as any).ref) {
        const resolved = resolveComponent((node as any).ref, (node as any).overrides || (node as any).props);
        if (resolved) {
            // Merge any top-level layout overrides from the ref node
            if ((node as any).width !== undefined) resolved.width = (node as any).width;
            if ((node as any).height !== undefined) resolved.height = (node as any).height;
            return resolved;
        }
        // If ref not found, return as-is (it'll be rendered as an empty frame)
        return { type: "frame", width: (node as any).width || 100, height: (node as any).height || 40, fill: "#fee2e2", borderWidth: 1, borderColor: "#ef4444", children: [{ type: "text", content: `Unknown: ${(node as any).ref}`, fontSize: 12, color: "#ef4444" }] };
    }

    // Recurse into children
    if (node.children) {
        node.children = node.children.map(child => resolveRefs(child));
    }

    return node;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findFirstText(node: PenNode): PenNode | null {
    if (node.type === "text") return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findFirstText(child);
            if (found) return found;
        }
    }
    return null;
}

function findAllTexts(node: PenNode): PenNode[] {
    const results: PenNode[] = [];
    if (node.type === "text") results.push(node);
    if (node.children) {
        for (const child of node.children) {
            results.push(...findAllTexts(child));
        }
    }
    return results;
}
