import { defineConfig } from 'vite';
import { deploymentBase } from './src/paths';

export default defineConfig({
  base: deploymentBase(process.env.VITE_BASE_PATH ?? '/IfcCostEstimator/'),
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // web-ifc (the largest dependency) goes in its own chunk so the app
          // shell can render before it is downloaded and parsed.
          if (id.includes('web-ifc')) return 'web-ifc';
          // Three.js in its own chunk — large but needed for the viewer.
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});