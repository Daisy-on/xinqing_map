import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/map/HomeView.vue'),
      meta: { keepAlive: true },
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/views/auth/AuthView.vue'),
    },
    {
      path: '/firefly',
      name: 'firefly',
      component: () => import('@/views/special/FireflyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/match',
      name: 'match',
      component: () => import('@/views/chat/MatchView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/chat/ChatView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/spots/:spotId',
      name: 'spot-detail',
      component: () => import('@/views/map/SpotDetailView.vue'),
    },
    {
      path: '/compose',
      name: 'compose',
      component: () => import('@/views/social/ComposeView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/profile/ProfileView.vue'),
    },
    {
      path: '/mood/calendar',
      name: 'mood-calendar',
      component: () => import('@/views/mood/MoodCalendarView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mood/edit/:date',
      name: 'mood-edit',
      component: () => import('@/views/mood/MoodEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mood/trend',
      name: 'mood_trend',
      component: () => import('@/views/mood/MoodTrendView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/post/:id',
      name: 'post-detail',
      component: () => import('@/views/social/PostDetailView.vue'),
    },
    {
      path: '/capsule',
      name: 'capsule',
      component: () => import('@/views/special/CapsuleView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.requiresAuth && to.name !== 'compose') {
    return true
  }

  const token = getToken()
  if (token) {
    return true
  }

  return {
    name: 'auth',
    query: {
      redirect: to.fullPath,
    },
  }
})

export default router

