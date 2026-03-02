/**
 * Component Catalog — Metadata for the list_components tool.
 *
 * This is the MCP-side summary of available components. The actual PenNode
 * templates live in canvas/src/components.ts. This file is intentionally
 * separate so the MCP server can describe components without importing
 * the canvas package.
 *
 * @module data/component-catalog
 */

export interface ComponentMeta {
  name: string;
  category: string;
  description: string;
  overrides: string;
}

export const COMPONENT_CATALOG: ComponentMeta[] = [
  // Buttons
  { name: "Button/Primary",     category: "Buttons",    description: "Primary CTA button with brand color fill and shadow",       overrides: "label, fill, cornerRadius" },
  { name: "Button/Secondary",   category: "Buttons",    description: "Secondary button with subtle background",                   overrides: "label, fill" },
  { name: "Button/Outline",     category: "Buttons",    description: "Outline button with border only",                           overrides: "label, borderColor" },
  { name: "Button/Ghost",       category: "Buttons",    description: "Ghost button — text only, no background",                   overrides: "label, color" },
  { name: "Button/Destructive", category: "Buttons",    description: "Destructive/danger button with red fill",                   overrides: "label" },
  // Form
  { name: "Input",              category: "Form",       description: "Text input field with label",                               overrides: "label, placeholder" },
  { name: "Select",             category: "Form",       description: "Dropdown select with label and chevron",                    overrides: "label, placeholder" },
  { name: "Checkbox",           category: "Form",       description: "Checkbox with label",                                       overrides: "label, checked" },
  { name: "Switch",             category: "Form",       description: "Toggle switch with label",                                  overrides: "label, on" },
  // Display
  { name: "Card",               category: "Display",    description: "Card container with title and description",                 overrides: "title, description" },
  { name: "Avatar",             category: "Display",    description: "Circular avatar with initials",                             overrides: "initials, fill, size" },
  { name: "Badge",              category: "Display",    description: "Small colored label/tag",                                   overrides: "text, variant (success/warning/error/info/default)" },
  { name: "Divider",            category: "Display",    description: "Horizontal line separator",                                 overrides: "none" },
  // Feedback
  { name: "Alert",              category: "Feedback",   description: "Alert box with title and message",                          overrides: "title, message, variant (info/success/warning/error)" },
  // Navigation
  { name: "SidebarItem",        category: "Navigation", description: "Sidebar navigation item",                                   overrides: "label, icon, active" },
  { name: "SidebarItem/Active", category: "Navigation", description: "Active sidebar navigation item (highlighted)",              overrides: "label, icon" },
  { name: "Tab",                category: "Navigation", description: "Tab button (inactive)",                                     overrides: "label" },
  { name: "Tab/Active",         category: "Navigation", description: "Active tab button with bottom border",                      overrides: "label" },
];
