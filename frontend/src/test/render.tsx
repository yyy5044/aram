import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { ToastProvider } from '../components/Toast'
import LocationProbe from './LocationProbe'

export function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function renderRouter(routes: RouteObject[], initialEntry: string) {
  const queryClient = makeQueryClient()
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...utils, router, queryClient }
}

/** ui 하나를 path에 붙여 그려요. 다른 주소로 이동하면 LocationProbe가 그 주소를 보여줘요. */
export function renderWithProviders(ui: ReactElement, options: { route?: string; path?: string } = {}) {
  const path = options.path ?? '/'
  const route = options.route ?? path
  return renderRouter(
    [
      { path, element: ui },
      { path: '*', element: <LocationProbe /> },
    ],
    route,
  )
}

/** 실제 앱 라우트 전체로 그려요. */
export function renderRoutes(routes: RouteObject[], route: string) {
  return renderRouter(routes, route)
}
