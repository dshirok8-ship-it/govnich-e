import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Для GitHub Pages обычно base = '/<repo-name>/'
// Удобно задавать через env: VITE_BASE=/repo/
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  plugins: [react()],
  base
});
