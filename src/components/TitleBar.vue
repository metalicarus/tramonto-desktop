<template>
  <div class="titlebar">
    <div class="titlebar__left">
      <img src="/icons/icon.png" class="titlebar__icon" />
      <span class="titlebar__title">Tramonto</span>
    </div>
    <div class="titlebar__controls">
      <button class="titlebar__btn" @click="minimize">─</button>
      <button class="titlebar__btn" @click="maximize">□</button>
      <button class="titlebar__btn titlebar__btn--close" @click="close">✕</button>
    </div>
  </div>
</template>

<script setup>
function minimize() { window.electronAPI.minimize() }
function maximize() { window.electronAPI.maximize() }
function close() { window.electronAPI.close() }
</script>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  background: #1e1e1e;
  color: #fff;
  padding: 0 8px;
  -webkit-app-region: drag;
  user-select: none;
  z-index: 9999;
}

.titlebar__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.titlebar__icon {
  width: 16px;
  height: 16px;
}

.titlebar__title {
  font-size: 12px;
  color: #ccc;
}

.titlebar__controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.titlebar__btn {
  background: transparent;
  border: none;
  color: #ccc;
  width: 46px;
  height: 32px;
  cursor: pointer;
  font-size: 14px;
}

.titlebar__btn:hover {
  background: #3a3a3a;
}

.titlebar__btn--close:hover {
  background: #e81123;
  color: #fff;
}
</style>
