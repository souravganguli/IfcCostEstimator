import { AmbientLight, Color, DirectionalLight, GridHelper, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { frameModels } from './framing';
import type { ElementIdentity, ViewerPicking } from '../../core/contracts';

export class Viewer implements ViewerPicking {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(45, 1, 0.01, 1000000);
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  readonly grid = new GridHelper(100, 100, 0x9caea3, 0xcdd8d0);
  private readonly resize: ResizeObserver;
  private readonly models = new Set<Group>();
  private readonly raycaster = new Raycaster();
  private highlighted?: { mesh: Mesh; emissive: Color; intensity: number };
  private disposed = false;
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.dispose();
    this.onError('Graphics context lost. Reload the page and reopen your files.');
  };

  constructor(private readonly container: HTMLElement, private readonly onError: (message: string) => void = () => {}) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.setAttribute('aria-label', 'IFC model scene');
    this.container.prepend(this.renderer.domElement);
    this.scene.background = new Color(0xeaf0ed);
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
    group.removeFromParent();
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
  }
}