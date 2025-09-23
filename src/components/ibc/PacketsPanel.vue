<template>
  <div class="panel">
    <h3 class="title">Packets</h3>
    <div class="grid">
      <div>
        <div class="label">Commitments</div>
        <div>—</div>
      </div>
      <div>
        <div class="label">Unreceived Packets</div>
        <div>—</div>
      </div>
      <div>
        <div class="label">Unreceived Acks</div>
        <div>—</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Placeholder; wire to channel later.
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
.label {
  font-size: 12px;
  color: #6b7280;
}
</style>
