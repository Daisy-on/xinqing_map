<template>
  <main class="home-view">
    <h1>心晴地图</h1>
    <p>地图主页骨架已就绪，先从这里开始开发。</p>
    <nav class="entry-nav">
      <RouterLink to="/auth">登录/注册</RouterLink>
      <RouterLink to="/spots/1">地点详情示例</RouterLink>
      <RouterLink to="/compose">发布心情</RouterLink>
      <RouterLink to="/profile">我的主页</RouterLink>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.home-view {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.entry-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.entry-nav a {
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  background: #f4f6fb;
  color: #334155;
  text-decoration: none;
}

.entry-nav a:hover {
  background: #e2e8f0;
}
</style>
