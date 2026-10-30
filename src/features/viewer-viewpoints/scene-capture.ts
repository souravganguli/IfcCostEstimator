// Bridges the injected viewer/feature capabilities to the pure saved-view
// snapshot shape. Capture reads live scene state through the ViewpointScene
// boundary; restore applies it deterministically and reports missing elements.

import type {
  ElementIdentity,
  ModelSession,
  SelectionCapability,
  ViewpointScene,
} from '../../core/contracts';
import type {
  SavedViewComponent,
  SavedViewSnapshot,
  SnapshotCategory,
  Vec3Tuple,
} from '../../core/saved-views';

/** Capabilities the saved-view feature needs to capture and restore scenes. */
export interface ViewpointCapabilities {
  readonly scene: ViewpointScene;
  readonly session: ModelSession;
  readonly selection: SelectionCapability;
  /** Exit walkthrough/first-person to orbit before a restore (§R10). */
  exitWalkthrough(): void;
}

/** Resolve an element's IFC GlobalId for cross-session reference matching. */
function globalIdOf(session: ModelSession, identity: ElementIdentity): string | undefined {
  const asset = session.getAsset(identity.modelId);
  return asset?.properties?.getMetadata(identity)?.globalId;
}

function toComponent(session: ModelSession, identity: ElementIdentity): SavedViewComponent {
  return { modelId: identity.modelId, expressId: identity.expressId, globalId: globalIdOf(session, identity) };
}

/** Capture the requested categories of the current scene into a snapshot. */
export function captureSnapshot(
  capabilities: ViewpointCapabilities,
  categories: ReadonlySet<SnapshotCategory>,
): SavedViewSnapshot {
  const { scene, session, selection } = capabilities;
  const snapshot: {
    camera?: SavedViewSnapshot['camera'];
    clippingPlanes?: SavedViewSnapshot['clippingPlanes'];
    visibility?: SavedViewSnapshot['visibility'];
    selection?: SavedViewComponent[];
    coloring?: SavedViewSnapshot['coloring'];
  } = {};

  if (categories.has('camera')) {
    const camera = scene.captureCamera();
    snapshot.camera =
      camera.kind === 'orthographic'
        ? {
            kind: 'orthographic',
            position: camera.position as Vec3Tuple,
            target: camera.target as Vec3Tuple,
            up: camera.up as Vec3Tuple,
            viewToWorldScale: camera.viewToWorldScale,
          }
        : {
            kind: 'perspective',
            position: camera.position as Vec3Tuple,
            target: camera.target as Vec3Tuple,
            up: camera.up as Vec3Tuple,
            fieldOfView: camera.fieldOfView,
          };
  }

  if (categories.has('clipping')) {
    snapshot.clippingPlanes = scene.captureClipping().map((plane) => ({
      location: plane.location as Vec3Tuple,
      direction: plane.direction as Vec3Tuple,
    }));
  }

  if (categories.has('visibility')) {
    snapshot.visibility = {
      defaultVisibility: true,
      viewSetupHints: { spacesVisible: true, spaceBoundariesVisible: true, openingsVisible: true },
      exceptions: scene.captureHidden().map((component) => toComponent(session, component)),
    };
  }

  if (categories.has('selection')) {
    const current = selection.current();
    snapshot.selection = current ? [toComponent(session, current)] : [];
  }

  if (categories.has('coloring')) {
    snapshot.coloring = scene.captureColoring().map((entry) => ({
      ...toComponent(session, entry),
      color: entry.color,
    }));
  }

  return snapshot;
}

export interface RestoreResult {
  /** Element references that could not be matched to a loaded model. */
  readonly missing: number;
  /** True when the view's source model is absent entirely. */
  readonly cameraOnly: boolean;
}

/** True when the component's owning model is loaded. */
function resolveComponent(session: ModelSession, component: SavedViewComponent): ElementIdentity | undefined {
  const loaded = session.getModels().some((model) => model.id === component.modelId && model.state === 'loaded');
  if (loaded) {
    const asset = session.getAsset(component.modelId);
    // Prefer a GlobalId match when present and the stored express id drifted.
    if (component.globalId && asset?.properties) {
      const direct = asset.properties.getMetadata({ modelId: component.modelId, expressId: component.expressId });
      if (direct?.globalId === component.globalId) {
        return { modelId: component.modelId, expressId: component.expressId };
      }
    }
    return { modelId: component.modelId, expressId: component.expressId };
  }
  // Fall back to a GlobalId search across loaded models (cross-session import).
  if (component.globalId) {
    for (const model of session.getModels()) {
      if (model.state !== 'loaded') continue;
      const asset = session.getAsset(model.id);
      const all = asset?.elements?.getAll() ?? [];
      for (const identity of all) {
        if (asset?.properties?.getMetadata(identity)?.globalId === component.globalId) return identity;
      }
    }
  }
  return undefined;
}

/**
 * Apply a snapshot to the scene. Camera and clipping always restore; element
 * visibility/coloring/selection are resolved against loaded models and missing
 * references are counted (never silently dropped as applied). Deterministic:
 * each category replaces the prior transient state for that category.
 */
export function restoreSnapshot(
  capabilities: ViewpointCapabilities,
  snapshot: SavedViewSnapshot,
): RestoreResult {
  const { scene, session, selection, exitWalkthrough } = capabilities;
  exitWalkthrough();

  let missing = 0;

  if (snapshot.camera) {
    scene.applyCamera(
      snapshot.camera.kind === 'orthographic'
        ? {
            kind: 'orthographic',
            position: snapshot.camera.position,
            target: snapshot.camera.target,
            up: snapshot.camera.up,
            viewToWorldScale: snapshot.camera.viewToWorldScale,
          }
        : {
            kind: 'perspective',
            position: snapshot.camera.position,
            target: snapshot.camera.target,
            up: snapshot.camera.up,
            fieldOfView: snapshot.camera.fieldOfView,
          },
    );
  }

  if (snapshot.clippingPlanes) scene.applyClipping(snapshot.clippingPlanes);

  if (snapshot.visibility) {
    const hidden: ElementIdentity[] = [];
    for (const exception of snapshot.visibility.exceptions) {
      const resolved = resolveComponent(session, exception);
      if (resolved) hidden.push(resolved);
      else missing += 1;
    }
    scene.applyHidden(hidden);
  }

  if (snapshot.coloring) {
    const coloring = [] as { modelId: number; expressId: number; color: string }[];
    for (const entry of snapshot.coloring) {
      const resolved = resolveComponent(session, entry);
      if (resolved) coloring.push({ modelId: resolved.modelId, expressId: resolved.expressId, color: entry.color });
      else missing += 1;
    }
    scene.applyColoring(coloring);
  }

  if (snapshot.selection) {
    const first = snapshot.selection[0];
    if (first) {
      const resolved = resolveComponent(session, first);
      if (resolved) selection.set(resolved);
      else {
        missing += 1;
        selection.clear();
      }
    } else {
      selection.clear();
    }
  }

  const anyModelLoaded = session.getModels().some((model) => model.state === 'loaded');
  return { missing, cameraOnly: !anyModelLoaded };
}
