import { createRouter, createWebHistory } from 'vue-router'
import CraneSimulation from '@/views/CraneSimulation.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'crane-simulation',
      component: CraneSimulation,
    },
    // Redirect all other paths to the crane simulation
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
