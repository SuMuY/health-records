<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const activeTab = computed(() => (route.meta.tab as string) || 'clients')

function onTabChange(name: string | number) {
  if (name === 'clients') router.push('/clients')
  else if (name === 'templates') router.push('/templates')
}
</script>

<template>
  <div class="app-container">
    <router-view />
    <van-tabbar
      v-if="route.meta.tab"
      :model-value="activeTab"
      @change="onTabChange"
      active-color="#07c160"
      inactive-color="#969799"
    >
      <van-tabbar-item name="clients" icon="friends-o">客户</van-tabbar-item>
      <van-tabbar-item name="templates" icon="description">模板</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.app-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
