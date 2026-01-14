import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Enable the React plugin so JSX in .js files is handled
export default defineConfig({
  plugins: [react()],
})
