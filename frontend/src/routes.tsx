import type { RouteObject } from 'react-router'
import AppLayout from './components/AppLayout'
import AuthDonePage from './pages/AuthDonePage'
import ComingSoon from './pages/ComingSoon'
import NotFoundPage from './pages/NotFoundPage'
import WelcomePage from './pages/WelcomePage'

export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <ComingSoon /> },
      { path: '/posts/:postId', element: <ComingSoon /> },
      { path: '/posts/:postId/edit', element: <ComingSoon /> },
      { path: '/write', element: <ComingSoon /> },
      { path: '/champions/:championId', element: <ComingSoon /> },
      { path: '/augments/:augmentId', element: <ComingSoon /> },
      { path: '/welcome', element: <WelcomePage /> },
      { path: '/auth/done', element: <AuthDonePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
