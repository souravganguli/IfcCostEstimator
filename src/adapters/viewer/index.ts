import { AmbientLight, Color, DirectionalLight, GridHelper, Group, Mesh, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { frameModels } from './framing';
import type {
  ElementIdentity,
  ElementVisibility,
  ViewerPicking,
  ViewpointCamera,
  ViewpointClippingPlane,
  ViewpointColoring,
  ViewpointComponent,
  ViewpointScene,
} from '../../core/contracts';

export class Viewer implements ViewerPicking, ElementVisibility, ViewpointScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(45, 1, 0.01, 1000000);
  /** Orthographic camera, activated only while a view's projection is orthographic. */
  readonly orthoCamera = new OrthographicCamera(-1, 1, 1, -1, -100000, 1000000);
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  readonly grid = new GridHelper(100, 100, 0xa19f9d, 0xd1d1d1);
  private readonly resize: ResizeObserver;
  private readonly models = new Set<Group>();
  private readonly raycaster = new Raycaster();
  private highlighted?: { mesh: Mesh; emissive: Color; intensity: number };
  private readonly hidden = new Map<number, Set<number>>();
  private readonly isolation = new Map<number, Set<number>>();
  private readonly saved = new Map<number, Set<number>>();
  private disposed = false;
  /** Active clipping planes shared by the section tool and saved-view restore. */
  private clippingPlanes: Plane[] = [];
  private orthographic = false;
  private orthoScale = 20;
  private readonly originalColors = new Map<string, Color>();
  /** Element overrides keyed by `modelId:expressId`, for deterministic capture/restore. */
  private readonly elementColors = new Map<string, string>();
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.dispose();
    this.onError('Graphics context lost. Reload the page and reopen your files.');
  };

  constructor(private readonly container: HTMLElement, private readonly onError: (message: string) => void = () => {}) {
    this.renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.localClippingEnabled = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.setAttribute('aria-label', 'IFC model scene');
    this.container.prepend(this.renderer.domElement);
    this.scene.background = new Color(0xf0f0f0);
    this.scene.add(new AmbientLight(0xffffff, 2));
    const sunlight = new DirectionalLight(0xffffff, 3);
    sunlight.position.set(12, 20, 10);
    this.scene.add(sunlight, this.grid);
    this.camera.position.set(12, 9, 12);
    this.orthoCamera.position.copy(this.camera.position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.update();
    this.resize = new ResizeObserver(() => this.resizeViewport());
    this.resize.observe(container);
    this.resizeViewport();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.activeCamera());
    });
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
  }

  setModelDisplay(modelId: number, options: { wireframe?: boolean; opacity?: number }): void {
    for (const group of this.models) {
      if (group.userData.modelId !== modelId) continue;
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          if (options.wireframe !== undefined) material.wireframe = options.wireframe;
          if (options.opacity !== undefined) {
            material.opacity = Math.max(0.05, Math.min(1, options.opacity));
            material.transparent = material.opacity < 1;
          }
        });
      });
    }
  }

  setElementColor(modelId: number, expressId: number, color: string | null): void {
    const key = `${modelId}:${expressId}`;
    if (color) this.elementColors.set(key, color);
    else this.elementColors.delete(key);
    for (const group of this.models) {
      if (group.userData.modelId !== modelId) continue;
      group.traverse((object) => {
        if (!(object instanceof Mesh) || object.userData.expressId !== expressId) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          if (!this.originalColors.has(material.uuid)) this.originalColors.set(material.uuid, material.color.clone());
          material.color.copy(color ? new Color(color) : this.originalColors.get(material.uuid)!);
        });
      });
    }
  }

  setClipping(plane: { normal: { x: number; y: number; z: number }; constant: number } | null): void {
    this.clippingPlanes = plane
      ? [new Plane(new Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize(), plane.constant)]
      : [];
    this.applyClippingToMaterials();
  }

  private applyClippingToMaterials(): void {
    const planes = this.clippingPlanes;
    for (const group of this.models) group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => { if (material instanceof MeshStandardMaterial) material.clippingPlanes = planes.length ? planes : []; });
    });
  }

  /** The camera the renderer and picking currently use (perspective or orthographic). */
  private activeCamera(): PerspectiveCamera | OrthographicCamera {
    return this.orthographic ? this.orthoCamera : this.camera;
  }

  setFirstPerson(enabled: boolean): void {
    // Walkthrough always uses the perspective camera; switch back from any
    // orthographic saved-view projection before entering first person.
    if (enabled && this.orthographic) this.setPerspective();
    this.controls.enabled = !enabled;
    if (enabled) {
      this.camera.rotation.order = 'YXZ';
      this.camera.position.y = Math.max(this.camera.position.y, 1.6);
    }
  }

  private resizeViewport(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.updateOrthoFrustum(width / height);
    this.renderer.setSize(width, height, false);
  }

  /** Recompute the orthographic frustum from the vertical world-space extent. */
  private updateOrthoFrustum(aspect: number): void {
    const halfHeight = this.orthoScale / 2;
    const halfWidth = halfHeight * (Number.isFinite(aspect) && aspect > 0 ? aspect : 1);
    this.orthoCamera.left = -halfWidth;
    this.orthoCamera.right = halfWidth;
    this.orthoCamera.top = halfHeight;
    this.orthoCamera.bottom = -halfHeight;
    this.orthoCamera.updateProjectionMatrix();
  }

  add(group: Group): void {
    if (this.disposed) throw new Error('Viewer has been disposed.');
    this.models.add(group);
    group.traverse((object) => {
      if (object instanceof Mesh) object.userData.modelId = group.userData.modelId;
    });
    this.scene.add(group);
    // Newly added models inherit any active clipping/coloring so restored
    // views remain consistent if a model loads after a view is applied.
    if (this.clippingPlanes.length) this.applyClippingToMaterials();
    this.reapplyColors(group.userData.modelId);
  }

  /** Re-apply tracked element color overrides to a model's meshes. */
  private reapplyColors(modelId: number): void {
    for (const [key, color] of this.elementColors) {
      const [mId, eId] = key.split(':').map(Number);
      if (mId === modelId) this.setElementColor(mId, eId, color);
    }
  }

  remove(group: Group): void {
    if (this.highlighted && group.getObjectById(this.highlighted.mesh.id)) this.highlight(null);
    const modelId = group.userData.modelId;
    this.models.delete(group);
    this.hidden.delete(modelId);
    this.isolation.delete(modelId);
    this.saved.delete(modelId);
    for (const key of this.elementColors.keys()) {
      if (Number(key.split(':')[0]) === modelId) this.elementColors.delete(key);
    }
    group.removeFromParent();
  }

  private apply(modelId: number): void {
    const hidden = this.hidden.get(modelId) ?? new Set<number>();
    for (const group of this.models) {
      if (group.userData.modelId !== modelId) continue;
      group.traverse((object) => {
        if (object instanceof Mesh && Number.isInteger(object.userData.expressId)) {
          object.visible = !hidden.has(object.userData.expressId);
        }
      });
    }
  }

  hide(modelId: number, expressIds: readonly number[]): void {
    const hidden = this.hidden.get(modelId) ?? new Set<number>();
    expressIds.forEach((id) => hidden.add(id));
    this.hidden.set(modelId, hidden);
    this.apply(modelId);
  }

  show(modelId: number, expressIds: readonly number[]): void {
    const hidden = this.hidden.get(modelId) ?? new Set<number>();
    expressIds.forEach((id) => hidden.delete(id));
    this.hidden.set(modelId, hidden);
    this.apply(modelId);
  }

  isolate(modelId: number, expressIds: readonly number[]): void {
    if (!this.isolation.has(modelId)) this.saved.set(modelId, new Set(this.hidden.get(modelId) ?? []));
    const visible = new Set(expressIds);
    const all = new Set<number>();
    for (const group of this.models) {
      if (group.userData.modelId !== modelId) continue;
      group.traverse((object) => {
        if (object instanceof Mesh && Number.isInteger(object.userData.expressId)) all.add(object.userData.expressId);
      });
    }
    this.hidden.set(modelId, new Set([...all].filter((id) => !visible.has(id))));
    this.isolation.set(modelId, visible);
    this.apply(modelId);
  }

  restore(modelId: number): void {
    const saved = this.saved.get(modelId);
    if (saved) this.hidden.set(modelId, new Set(saved));
    else this.hidden.delete(modelId);
    this.isolation.delete(modelId);
    this.saved.delete(modelId);
    this.apply(modelId);
  }

  showAll(): void {
    for (const modelId of this.hidden.keys()) {
      this.hidden.delete(modelId);
      this.isolation.delete(modelId);
      this.saved.delete(modelId);
      this.apply(modelId);
    }
  }

  hiddenOf(modelId: number): ReadonlySet<number> {
    return this.hidden.get(modelId) ?? new Set();
  }

  isIsolated(modelId: number): boolean {
    return this.isolation.has(modelId);
  }

  // ElementVisibility.subscribe: the viewer re-renders every frame via its
  // animation loop, so there is no need to notify external subscribers.
  subscribe(): () => void {
    return () => {};
  }

  pick(clientX: number, clientY: number): ElementIdentity | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.raycaster.setFromCamera(new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    ), this.activeCamera());
    const hits = this.raycaster.intersectObjects([...this.models], true);
    const hit = hits.find((item) => item.object instanceof Mesh && Number.isInteger(item.object.userData.expressId));
    if (!hit) return null;
    return { modelId: hit.object.userData.modelId, expressId: hit.object.userData.expressId };
  }

  getPoint(clientX: number, clientY: number): Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.raycaster.setFromCamera(
      new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.activeCamera(),
    );
    const hit = this.raycaster
      .intersectObjects([...this.models], true)
      .find((item) => item.object instanceof Mesh);
    return hit?.point.clone() ?? null;
  }

  highlight(identity: ElementIdentity | null): void {
    if (this.highlighted) {
      const material = this.highlighted.mesh.material;
      if (material instanceof MeshStandardMaterial) {
        material.emissive.copy(this.highlighted.emissive);
        material.emissiveIntensity = this.highlighted.intensity;
      }
      this.highlighted = undefined;
    }
    if (!identity) return;
    for (const group of this.models) {
      if (group.userData.modelId !== identity.modelId) continue;
      let found: Mesh | undefined;
      group.traverse((object) => {
        if (object instanceof Mesh && object.userData.expressId === identity.expressId) found = object;
      });
      if (!found) continue;
      const material = found.material;
      if (material instanceof MeshStandardMaterial) {
        this.highlighted = { mesh: found, emissive: material.emissive.clone(), intensity: material.emissiveIntensity };
        material.emissive.set(0x2d8cff);
        material.emissiveIntensity = 0.8;
      }
      return;
    }
  }

  fit(): void {
    if (this.disposed) return;
    const frame = frameModels([...this.models], this.camera.aspect, this.camera.fov);
    if (!frame) return;
    this.controls.target.copy(frame.center);
    this.camera.position.copy(frame.position);
    this.camera.near = frame.near;
    this.camera.far = frame.far;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  // --- ViewpointScene: serialisable capture / restore --------------------

  private setPerspective(): void {
    if (!this.orthographic) return;
    this.orthographic = false;
    this.controls.object = this.camera;
    this.controls.update();
  }

  private setOrthographic(): void {
    this.orthographic = true;
    this.controls.object = this.orthoCamera;
    this.controls.update();
  }

  captureCamera(): ViewpointCamera {
    const cam = this.activeCamera();
    const position = cam.position.toArray() as [number, number, number];
    const target = this.controls.target.toArray() as [number, number, number];
    const up = cam.up.toArray() as [number, number, number];
    if (this.orthographic) {
      return { kind: 'orthographic', position, target, up, viewToWorldScale: this.orthoScale };
    }
    return { kind: 'perspective', position, target, up, fieldOfView: this.camera.fov };
  }

  applyCamera(camera: ViewpointCamera): void {
    if (this.disposed) return;
    const target = new Vector3(...camera.target);
    const position = new Vector3(...camera.position);
    const up = new Vector3(...camera.up);
    if (![...position.toArray(), ...target.toArray()].every(Number.isFinite)) return;
    if (camera.kind === 'orthographic') {
      this.orthoScale = Number.isFinite(camera.viewToWorldScale) && camera.viewToWorldScale > 0 ? camera.viewToWorldScale : this.orthoScale;
      this.setOrthographic();
      this.orthoCamera.position.copy(position);
      this.orthoCamera.up.copy(up);
      this.updateOrthoFrustum(this.camera.aspect);
    } else {
      this.setPerspective();
      if (Number.isFinite(camera.fieldOfView) && camera.fieldOfView > 0 && camera.fieldOfView < 180) {
        this.camera.fov = camera.fieldOfView;
      }
      this.camera.position.copy(position);
      this.camera.up.copy(up);
      this.camera.updateProjectionMatrix();
    }
    this.controls.target.copy(target);
    this.controls.update();
  }

  captureClipping(): readonly ViewpointClippingPlane[] {
    return this.clippingPlanes.map((plane) => {
      // Three.js plane: normal·x + constant = 0, with the negative half-space
      // clipped. BCF direction points into the clipped half-space (-normal),
      // and location is a representative point on the plane.
      const location = plane.normal.clone().multiplyScalar(-plane.constant);
      const direction = plane.normal.clone().negate();
      return {
        location: location.toArray() as [number, number, number],
        direction: direction.toArray() as [number, number, number],
      };
    });
  }

  applyClipping(planes: readonly ViewpointClippingPlane[]): void {
    this.clippingPlanes = planes.flatMap((plane) => {
      const direction = new Vector3(...plane.direction);
      if (!direction.toArray().every(Number.isFinite) || direction.lengthSq() === 0) return [];
      const normal = direction.clone().negate().normalize();
      const location = new Vector3(...plane.location);
      const constant = -normal.dot(location);
      return [new Plane(normal, constant)];
    });
    this.applyClippingToMaterials();
  }

  captureColoring(): readonly ViewpointColoring[] {
    return [...this.elementColors].map(([key, color]) => {
      const [modelId, expressId] = key.split(':').map(Number);
      return { modelId, expressId, color };
    });
  }

  applyColoring(coloring: readonly ViewpointColoring[]): void {
    // Replace, not merge: reset every currently colored element, then apply
    // the target set so no override leaks across views.
    const previous = [...this.elementColors.keys()];
    for (const key of previous) {
      const [modelId, expressId] = key.split(':').map(Number);
      this.setElementColor(modelId, expressId, null);
    }
    for (const entry of coloring) this.setElementColor(entry.modelId, entry.expressId, entry.color);
  }

  captureHidden(): readonly ViewpointComponent[] {
    const result: ViewpointComponent[] = [];
    for (const [modelId, ids] of this.hidden) {
      for (const expressId of ids) result.push({ modelId, expressId });
    }
    return result;
  }

  applyHidden(hidden: readonly ViewpointComponent[]): void {
    // Replace visibility deterministically: clear all hidden/isolation state,
    // then hide exactly the listed elements.
    for (const modelId of [...this.hidden.keys()]) {
      this.hidden.delete(modelId);
      this.isolation.delete(modelId);
      this.saved.delete(modelId);
      this.apply(modelId);
    }
    const byModel = new Map<number, number[]>();
    for (const component of hidden) {
      const list = byModel.get(component.modelId) ?? [];
      list.push(component.expressId);
      byModel.set(component.modelId, list);
    }
    for (const [modelId, ids] of byModel) this.hide(modelId, ids);
  }

  captureThumbnail(maxSize: number): string | undefined {
    if (this.disposed) return undefined;
    try {
      // Render once so the preserved drawing buffer is current, then downscale
      // to a small off-screen canvas sized to stay within storage quota.
      this.renderer.render(this.scene, this.activeCamera());
      const source = this.renderer.domElement;
      const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return undefined;
      context.drawImage(source, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } catch {
      return undefined;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.resize.disconnect();
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.grid.geometry.dispose();
    const materials = Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material];
    materials.forEach((material) => material.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.scene.clear();
    this.models.clear();
    this.hidden.clear();
    this.isolation.clear();
    this.saved.clear();
    this.elementColors.clear();
    this.originalColors.clear();
    this.clippingPlanes = [];
  }
}