import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: { proxy: { '/api': { target: 'https://saberio-api.vercel.app', changeOrigin: true, cookieDomainRewrite: '', configure(proxy) {
    proxy.on('proxyRes', (response) => {
      if (response.headers['set-cookie']) response.headers['set-cookie'] = response.headers['set-cookie'].map(cookie => cookie.replace(/;\s*Secure/gi, ''))
    })
  } } },
})
