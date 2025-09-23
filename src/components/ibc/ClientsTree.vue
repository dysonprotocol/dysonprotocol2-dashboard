<template>
  <div class="tree">
    <ul>
      <li>
        <details>
          <summary>client-0</summary>
          <ul>
            <li>
              <details>
                <summary>connection-0</summary>
                <ul>
                  <li>
                    <details>
                      <summary>transfer/channel-0</summary>
                      <div class="panel">
                        <div>next send: —</div>
                        <div>next recv: —</div>
                        <div>
                          <Button type="button">View packets</Button>
                        </div>
                      </div>
                    </details>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </details>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
// Static placeholder; data wiring to follow.
</script>

<style scoped>
.tree ul {
  padding-left: 16px;
}
.panel {
  border: 1px solid #e5e7eb;
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
}
button {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #f9fafb;
}
</style>
