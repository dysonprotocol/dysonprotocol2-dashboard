<template>
  <div>
    <h2 class="title">Connections</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>connection_id</th>
            <th>client_id</th>
            <th>state</th>
            <th>delay_period</th>
            <th>versions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>connection-0</td>
            <td>client-0</td>
            <td>OPEN</td>
            <td>—</td>
            <td>1</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
// Placeholder static table; wire to data later.
</script>

<style scoped>
.title {
  font-size: 16px;
  margin: 8px 0;
}
.table-wrap {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
}
thead th {
  font-size: 12px;
  color: #6b7280;
}
</style>
