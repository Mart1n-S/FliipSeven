import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/presentation/views/HomeView.vue'),
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/presentation/views/SetupView.vue'),
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('@/presentation/views/GameView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
