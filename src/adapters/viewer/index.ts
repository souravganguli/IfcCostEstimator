import { AmbientLight, Color, DirectionalLight, GridHelper, Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { frameModels } from './framing';

export class Viewer {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(45, 1, 0.01, 1000000);
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  readonly grid = new GridHelper(100, 100, 0x9caea3, 0xcdd8d0);
  private readonly resize: ResizeObserver;
  private readonly models = new Set<Group>();
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
    this.renderer.setSize(width, height);
  }

  add(group: Group): void {
    if (this.disposed) throw new Error('Viewer has been disposed.');
    this.models.add(group);
    this.scene.add(group);
  }

  remove(group: Group): void {
    this.models.delete(group);
    group.removeFromParent();
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