import { defineConfig } from 'vite';
import { deploymentBase } from './src/paths';

export default defineConfig({
  base: deploymentBase(process.env.VITE_BASE_PATH ?? '/IfcCostEstimator/'),
});