/**
 * Engine — Barrel export for all canvas engine modules.
 *
 * Each module is a self-contained "lego block":
 * - section-manager: Named section tracking + localStorage persistence
 * - shape-factory:   FlatShape → tldraw shape creation
 * - batch-processor: Handles batch/single WebSocket commands
 * - screenshot-handler: PNG capture with section cropping
 * - resize-handler: User resize propagation through shape tree
 *
 * @module engine
 */

export {
  sectionNameMap,
  sectionShapesMap,
  shapeParentMap,
  shapeChildrenMap,
  persistSectionMap,
  restoreSectionMap,
  clearSectionMaps,
  registerSection,
} from "./section-manager";

export { createFlatShape } from "./shape-factory";

export {
  handleBatch,
  type BatchCommand,
  type BatchOperation,
} from "./batch-handler";

export {
  handleSingle,
  type SingleCommand,
} from "./single-handler";

export { handleScreenshot } from "./screenshot-handler";

export { propagateResize } from "./resize-handler";

export {
  tryParseJSON,
  isValidCommand,
  isValidBatchCommand,
  isRelayable,
  type ValidCommand,
  type ValidBatchCommand,
} from "./message-validator";
