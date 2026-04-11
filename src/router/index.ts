import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '../views/AuthView.vue'
import SpotDetailView from '../views/SpotDetailView.vue'
import ComposeView from '../views/ComposeView.vue'
import ProfileView from '../views/ProfileView.vue'
import PostDetailView from '../views/PostDetailView.vue'
import MatchView from '@/views/MatchView.vue'
import ChatView from '@/views/ChatView.vue'
import { getToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
    },
    {
      path: '/match',
      name: 'match',
      component: MatchView,
      meta: { requiresAuth: true }
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatView,
      meta: { requiresAuth: true }
    },
    {
      path: '/spots/:spotId',
      name: 'spot-detail',
      component: SpotDetailView,
    },
    {
      path: '/compose',
      name: 'compose',
      component: ComposeView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
    },
    {
      path: '/post/:id',
      name: 'post-detail',
      component: PostDetailView,
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

