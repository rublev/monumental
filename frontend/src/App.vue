<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">Demo App</h1>
          </div>
          <nav class="flex space-x-8">
            <RouterLink 
              to="/" 
              class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-blue-600 bg-blue-50"
            >
              Home
            </RouterLink>
            <RouterLink 
              to="/about" 
              class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-blue-600 bg-blue-50"
            >
              About
            </RouterLink>
          </nav>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <RouterView />
    </main>
  </div>
</template>
