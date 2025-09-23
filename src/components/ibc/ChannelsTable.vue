<template>
  <div>
    <h2 class="title">Channels</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>port_id</th>
            <th>channel_id</th>
            <th>state</th>
            <th>ordering</th>
            <th>connection_hops</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>transfer</td>
            <td>channel-0</td>
            <td>OPEN</td>
            <td>ORDERED</td>
            <td>connection-0</td>
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
