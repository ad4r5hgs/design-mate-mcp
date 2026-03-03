/**
 * Section Manager — Tracks named sections and their shape ownership.
 *
 * Maintains two core maps:
 * - sectionNameMap:   rootShapeId → sectionName (for y-anchor resolution)
 * - sectionShapesMap: rootShapeId → [all shape IDs] (for cascade delete)
 *
 * Both are persisted to localStorage so they survive widget refreshes.
 *
 * @module engine/section-manager
 */

import type { Editor, TLShapeId } from "tldraw";
import { SECTION_MAP_KEY, SECTION_SHAPES_KEY } from "../constants";

// ─── Maps ────────────────────────────────────────────────────────────────────

/** rootShapeId → sectionName */
export const sectionNameMap = new Map<string, string>();

/** rootShapeId → [all shape IDs created for that section] */
export const sectionShapesMap = new Map<string, string[]>();

/**
 * Parent-child relationship maps — rebuilt on each batch_design call.
 * Used by resize-handler to walk the tree on user-initiated resizes.
 */
export const shapeParentMap = new Map<string, string>();   // childId  → parentId
export const shapeChildrenMap = new Map<string, string[]>(); // parentId → [childIds]

// ─── Persistence ─────────────────────────────────────────────────────────────

/** Persist both section maps to localStorage. */
export function persistSectionMap(): void {
  try {
    localStorage.setItem(SECTION_MAP_KEY, JSON.stringify(Object.fromEntries(sectionNameMap)));
    localStorage.setItem(SECTION_SHAPES_KEY, JSON.stringify(Object.fromEntries(sectionShapesMap)));
  } catch { /* quota exceeded or storage unavailable — non-fatal */ }
}

/** Restore section maps from localStorage, discarding stale entries. */
export function restoreSectionMap(editor: Editor): void {
  try {
    const existingIds = new Set<string>(editor.getCurrentPageShapes().map(s => s.id as string));

    const storedNames = localStorage.getItem(SECTION_MAP_KEY);
    if (storedNames) {
      const parsed: Record<string, string> = JSON.parse(storedNames);
      let restored = 0;
      for (const [shapeId, name] of Object.entries(parsed)) {
        if (existingIds.has(shapeId)) { sectionNameMap.set(shapeId, name); restored++; }
      }
      if (restored > 0) console.log(`[sections] restored ${restored} section(s) from storage`);
    }

    const storedShapes = localStorage.getItem(SECTION_SHAPES_KEY);
    if (storedShapes) {
      const parsed: Record<string, string[]> = JSON.parse(storedShapes);
      for (const [rootId, ids] of Object.entries(parsed)) {
        if (existingIds.has(rootId)) sectionShapesMap.set(rootId, ids);
      }
    }
  } catch { /* ignore parse / storage errors */ }
}

/** Clear all section and parent-child maps. */
export function clearSectionMaps(): void {
  sectionNameMap.clear();
  sectionShapesMap.clear();
  shapeParentMap.clear();
  shapeChildrenMap.clear();
  persistSectionMap();
}

/** Register a named section with its root ID and full shape ID list. */
export function registerSection(rootId: string, allIds: string[], name: string): void {
  sectionNameMap.set(rootId, name);
  sectionShapesMap.set(rootId, allIds);
  persistSectionMap();
}
