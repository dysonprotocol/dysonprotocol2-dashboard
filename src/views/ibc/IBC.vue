<template>
  <div class="container">
    <h1>IBC</h1>

    <section>
      <details open>
        <summary>Overview</summary>
        <OverviewCards />
      </details>
    </section>

    <section>
      <details open>
        <summary>Clients → Connections → Channels</summary>
        <ClientsTree />
      </details>
    </section>

    <section>
      <details open>
        <summary>ICS-20 (Transfer)</summary>
        <Ics20Panel />
      </details>
    </section>

    <section>
      <details open>
        <summary>ICS-27 (Interchain Accounts)</summary>
        <Ics27Panel />
      </details>
    </section>

    <section>
      <details open>
        <summary>Connections</summary>
        <ConnectionsTable />
      </details>
    </section>

    <section>
      <details open>
        <summary>Channels</summary>
        <ChannelsTable />
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import OverviewCards from '@/components/ibc/OverviewCards.vue'
import ClientsTree from '@/components/ibc/ClientsTree.vue'
import ConnectionsTable from '@/components/ibc/ConnectionsTable.vue'
import ChannelsTable from '@/components/ibc/ChannelsTable.vue'
import Ics20Panel from '@/components/ibc/Ics20Panel.vue'
import Ics27Panel from '@/components/ibc/Ics27Panel.vue'
</script>

<style scoped>
.container {
  display: block;
  padding: 16px;
}
section {
  margin-bottom: 16px;
}
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
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
