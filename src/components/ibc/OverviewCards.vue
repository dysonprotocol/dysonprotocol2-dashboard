<template>
  <div class="cards">
    <div class="card">
      <div class="card-title">Clients</div>
      <div class="card-value">—</div>
    </div>
    <div class="card">
      <div class="card-title">Connections</div>
      <div class="card-value">—</div>
    </div>
    <div class="card">
      <div class="card-title">Channels</div>
      <div class="card-value">—</div>
    </div>
    <div class="card">
      <div class="card-title">Packets</div>
      <div class="card-value">—</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Presentational placeholder; replace with real values later.
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}
.card {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
}
.card-title {
  font-size: 12px;
  color: #6b7280;
}
.card-value {
  font-size: 20px;
}
</style>
