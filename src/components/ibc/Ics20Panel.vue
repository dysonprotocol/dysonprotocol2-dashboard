<template>
  <div class="panel">
    <h3 class="title">ICS-20 (Transfer)</h3>
    <div class="grid">
      <div>
        <div class="label">send_enabled</div>
        <div>—</div>
      </div>
      <div>
        <div class="label">receive_enabled</div>
        <div>—</div>
      </div>
    </div>
    <form class="form" @submit.prevent>
      <label>
        Channel
        <input name="channel" placeholder="channel-0" />
      </label>
      <label>
        Port
        <input name="port" placeholder="transfer" />
      </label>
      <Button type="button">Escrow address</Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
</script>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
}
.title {
  margin: 0 0 8px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.label {
  font-size: 12px;
  color: #6b7280;
}
input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}
</style>
