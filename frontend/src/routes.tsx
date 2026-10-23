import type { RouteObject } from 'react-router'
import AppLayout from './components/AppLayout'
import AuthDonePage from './pages/AuthDonePage'
import ComingSoon from './pages/ComingSoon'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import TagPage from './pages/TagPage'
import WelcomePage from './pages/WelcomePage'

export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/posts/:postId', element: <ComingSoon /> },
      { path: '/posts/:postId/edit', element: <ComingSoon /> },
      { path: '/write', element: <ComingSoon /> },
      { path: '/champions/:championId', element: <TagPage kind="champion" /> },
      { path: '/augments/:augmentId', element: <TagPage kind="augment" /> },
      { path: '/welcome', element: <WelcomePage /> },
      { path: '/auth/done', element: <AuthDonePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
