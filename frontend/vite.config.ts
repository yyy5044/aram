/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 개발 중에는 API와 디스코드 로그인 요청을 Spring Boot(8080)로 넘겨요.
    // changeOrigin: false로 원래 주소(localhost:5173)를 유지해야, 디스코드에 등록한 돌아올 주소와 맞아요.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: false },
      '/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
      '/login/oauth2': { target: 'http://localhost:8080', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
