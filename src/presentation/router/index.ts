import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/presentation/views/HomeView.vue'),
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
