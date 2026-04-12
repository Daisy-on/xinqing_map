import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '../views/AuthView.vue'
import SpotDetailView from '../views/SpotDetailView.vue'
import ComposeView from '../views/ComposeView.vue'
import ProfileView from '../views/ProfileView.vue'
import PostDetailView from '../views/PostDetailView.vue'
import MatchView from '@/views/MatchView.vue'
import ChatView from '@/views/ChatView.vue'
import FireflyView from '@/views/FireflyView.vue'
import CapsuleView from '@/views/CapsuleView.vue'
import MoodCalendarView from '@/views/MoodCalendarView.vue'
import MoodEditView from '@/views/MoodEditView.vue'
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
      path: '/firefly',
      name: 'firefly',
      component: FireflyView,
      meta: { requiresAuth: true }
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
      path: '/mood/calendar',
      name: 'mood-calendar',
      component: MoodCalendarView,
      meta: { requiresAuth: true }
    },
    {
      path: '/mood/edit/:date',
      name: 'mood-edit',
      component: MoodEditView,
      meta: { requiresAuth: true }
    },
    {
      path: '/post/:id',
      name: 'post-detail',
      component: PostDetailView,
    },
    {
      path: '/capsule',
      name: 'capsule',
      component: CapsuleView,
      meta: { requiresAuth: true }
    }
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

