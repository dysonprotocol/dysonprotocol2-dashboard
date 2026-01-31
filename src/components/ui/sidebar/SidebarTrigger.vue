<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { PanelLeft } from "lucide-vue-next"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { useSidebar } from "./utils"
import dysLogoLight from '@/assets/images/dys.svg'
import dysLogoDark from '@/assets/images/dys-inverted.svg'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-7 w-7', props.class)"
    @click="toggleSidebar"
  >
    <!-- Mobile: dys logo (theme-aware via CSS) -->
    <img :src="dysLogoLight" alt="" class="size-7 hidden dark:block md:!hidden" />
    <img :src="dysLogoDark" alt="" class="size-7 block dark:hidden md:!hidden" />
    <!-- Desktop: panel left icon -->
    <PanelLeft class="hidden md:block" />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
