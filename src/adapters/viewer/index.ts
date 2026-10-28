import { AmbientLight, Color, DirectionalLight, GridHelper, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { frameModels } from './framing';
import type { ElementIdentity, ElementVisibility, ViewerPicking } from '../../core/contracts';

export class Viewer implements ViewerPicking, ElementVisibility {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(45, 1, 0.01, 1000000);
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
  private clippingPlane?: Plane;
  private readonly originalColors = new Map<string, Color>();
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.dispose();
    this.onError('Graphics context lost. Reload the page and reopen your files.');
  };

  constructor(private readonly container: HTMLElement, private readonly onError: (message: string) => void = () => {}) {
    this.renderer = new WebGLRenderer({ antialias: true });
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
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.update();
    this.resize = new ResizeObserver(() => this.resizeViewport());
    this.resize.observe(container);
    this.resizeViewport();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
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
    this.clippingPlane = plane ? new Plane(new Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize(), plane.constant) : undefined;
    for (const group of this.models) group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => { if (material instanceof MeshStandardMaterial) material.clippingPlanes = this.clippingPlane ? [this.clippingPlane] : []; });
    });
  }

  setFirstPerson(enabled: boolean): void {
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
    this.renderer.setSize(width, height, false);
  }

  add(group: Group): void {
    if (this.disposed) throw new Error('Viewer has been disposed.');
    this.models.add(group);
    group.traverse((object) => {
      if (object instanceof Mesh) object.userData.modelId = group.userData.modelId;
    });
    this.scene.add(group);
  }

  remove(group: Group): void {
    if (this.highlighted && group.getObjectById(this.highlighted.mesh.id)) this.highlight(null);
    this.models.delete(group);
    this.hidden.delete(group.userData.modelId);
    this.isolation.delete(group.userData.modelId);
    this.saved.delete(group.userData.modelId);
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
    ), this.camera);
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
      this.camera,
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
  }
}