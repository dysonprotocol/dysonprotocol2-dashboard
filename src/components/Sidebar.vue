<template>
  <!-- Sidebar -->
  <div
    id="layout-sidebar"
    class="sidebar-menu sidebar-menu-activation transition-[margin,top,max-height,border-radius] duration-300 ease-in-out motion-reduce:transition-none"
  >
    <div class="flex min-h-16 items-center justify-between gap-3 ps-5 pe-4">
      <a href="/" class="font-semibold">Dyson Protocol 2</a>
    </div>
    <div class="relative min-h-0 grow">
      <div data-simplebar class="size-full overflow-y-auto">
        <div class="mt-4 px-2.5 pb-4 space-y-2">
          <KeplrCard />
          <CosmjsWallets />

          <!-- chain explorer links -->
          <nav class="space-y-2 flex flex-col">
            <router-link to="/names" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" :class="linkClass(isActive)">
                <Tag class="size-4" />
                <span>Names</span>
              </a>
            </router-link>
            <router-link to="/blocks" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" :class="linkClass(isActive)">
                <SquareStack class="size-4" />
                <span>Blocks</span>
              </a>
            </router-link>
            <router-link to="/txs" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" :class="linkClass(isActive)">
                <ArrowLeftRight class="size-4" />
                <span>Transactions</span>
              </a>
            </router-link>
            <router-link to="/validators" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" :class="linkClass(isActive)">
                <ShieldCheck class="size-4" />
                <span>Validators</span>
              </a>
            </router-link>
            <router-link to="/gov" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" :class="linkClass(isActive)">
                <Landmark class="size-4" />
                <span>Governance</span>
              </a>
            </router-link>
            <router-link to="/tasks" custom v-slot="{ href, navigate, isActive }">
              <a :href="href" @click="navigate" :class="linkClass(isActive)">
                <Clock class="size-4" />
                <span>Crontasks</span>
              </a>
            </router-link>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'AppSidebar' })
import KeplrCard from '@/components/wallet/KeplrCard.vue'
import CosmjsWallets from '@/components/wallet/CosmjsWallets.vue'
import { Tag, SquareStack, ArrowLeftRight, ShieldCheck, Landmark, Clock } from 'lucide-vue-next'
import { linkClass } from '@/navigation/linkClass'
</script>
