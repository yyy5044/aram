import type { RouteObject } from 'react-router'
import AppLayout from './components/AppLayout'
import AugmentsPage from './pages/AugmentsPage'
import AuthDonePage from './pages/AuthDonePage'
import ChampionsPage from './pages/ChampionsPage'
import ErrorPage from './pages/ErrorPage'
import HomePage from './pages/HomePage'
import ItemsPage from './pages/ItemsPage'
import NotFoundPage from './pages/NotFoundPage'
import PostDetailPage from './pages/PostDetailPage'
import TagPage from './pages/TagPage'
import WelcomePage from './pages/WelcomePage'
import ProfileEditPage from './pages/ProfileEditPage'
import ProfilePage from './pages/ProfilePage'
import WritePage from './pages/WritePage'

export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/posts/:postId', element: <PostDetailPage /> },
      { path: '/posts/:postId/edit', element: <WritePage /> },
      { path: '/write', element: <WritePage /> },
      { path: '/users/:userId', element: <ProfilePage /> },
      { path: '/settings/profile', element: <ProfileEditPage /> },
      { path: '/augments', element: <AugmentsPage /> },
      { path: '/champions', element: <ChampionsPage /> },
      { path: '/items', element: <ItemsPage /> },
      { path: '/champions/:championId', element: <TagPage kind="champion" /> },
      { path: '/augments/:augmentId', element: <TagPage kind="augment" /> },
      { path: '/items/:itemId', element: <TagPage kind="item" /> },
      { path: '/welcome', element: <WelcomePage /> },
      { path: '/auth/done', element: <AuthDonePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
