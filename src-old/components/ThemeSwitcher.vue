<template>
  <button
    class="btn btn-square btn-ghost"
    @click="cycleTheme"
  >
    <component
      :is="currentIcon"
      class="w-5 h-5"
    />
  </button>
</template>

<script setup>
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from "@heroicons/vue/24/outline";
import { useTheme } from "../composables/useTheme";
import { computed } from "vue";

const { themeMode, setTheme, modes } = useTheme();

const cycleTheme = () => {
  const currentIndex = modes.indexOf(themeMode.value);
  const nextIndex = (currentIndex + 1) % modes.length;
  setTheme(modes[nextIndex]);
};

const currentIcon = computed(() => {
  return themeMode.value === "light"
    ? SunIcon
    : themeMode.value === "dark"
    ? MoonIcon
    : ComputerDesktopIcon;
});
</script>
