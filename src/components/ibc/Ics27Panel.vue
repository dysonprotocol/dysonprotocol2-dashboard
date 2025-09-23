<template>
  <div class="panel">
    <h3 class="title">ICS-27 (Interchain Accounts)</h3>
    <div class="grid">
      <div>
        <div class="label">controller_enabled</div>
        <div>—</div>
      </div>
      <div>
        <div class="label">host_enabled</div>
        <div>—</div>
      </div>
    </div>
    <form class="form" @submit.prevent>
      <label>
        Owner
        <input name="owner" placeholder="cosmos1..." />
      </label>
      <label>
        Connection ID
        <input name="connection_id" placeholder="connection-0" />
      </label>
      <Button type="button">Lookup ICA Address</Button>
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
