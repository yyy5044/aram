import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ToastProvider } from './components/Toast'
import './index.css'
import LanguageProvider from './components/LanguageProvider'
import { appRoutes } from './routes'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
const router = createBrowserRouter(appRoutes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>,
)
