import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		allowedHosts: ['2b29-2404-c0-ab01-ab5f-60e0-3340-d15-fcd8.ngrok-free.app'],
		proxy: {
			'/api': {
				target: 'http://localhost:4000',
				changeOrigin: true,
			},
		},
	},
})
