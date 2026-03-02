/**
 * Icon Catalog — Category-grouped icon names for the list_icons tool.
 *
 * The actual SVG data lives in canvas/src/icons.ts. This file provides
 * the metadata the MCP server needs to describe available icons to agents.
 *
 * @module data/icon-catalog
 */

export const ICON_CATALOG: Record<string, string[]> = {
  "Navigation":    ["arrow-right", "arrow-left", "arrow-up", "arrow-down", "arrow-up-right", "chevron-right", "chevron-left", "chevron-down", "chevron-up", "menu", "x", "more-horizontal", "more-vertical", "external-link"],
  "Actions":       ["search", "plus", "minus", "check", "copy", "download", "upload", "edit", "trash", "filter", "refresh-cw"],
  "People":        ["user", "users", "log-out", "log-in"],
  "Communication": ["mail", "message-square", "bell", "phone", "send"],
  "Content":       ["image", "file", "folder", "link", "clipboard"],
  "System":        ["settings", "home", "lock", "unlock", "shield", "eye", "eye-off"],
  "Status":        ["heart", "star", "thumbs-up", "alert-circle", "alert-triangle", "info", "check-circle"],
  "Analytics":     ["bar-chart", "trending-up", "trending-down", "activity", "pie-chart"],
  "Commerce":      ["shopping-cart", "credit-card", "dollar-sign"],
  "Layout":        ["grid", "layout", "sidebar", "calendar", "clock"],
  "Tech":          ["cloud", "globe", "wifi", "zap", "sparkles", "rocket"],
};
