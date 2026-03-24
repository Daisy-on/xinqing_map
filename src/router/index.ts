import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '../views/AuthView.vue'
import SpotDetailView from '../views/SpotDetailView.vue'
import ComposeView from '../views/ComposeView.vue'
import ProfileView from '../views/ProfileView.vue'

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
  ],
})

export default router
