import { useStorage, usePreferredDark } from "@vueuse/core";
import { computed, watch } from "vue";

export function useTheme() {
  const isDarkPreferred = usePreferredDark();
  const themeMode = useStorage("theme-mode", "auto");

  const theme = computed(() => {
    if (themeMode.value === "auto") {
      return isDarkPreferred.value ? "dark" : "light";
    }
    return themeMode.value === "dark" ? "dark" : "light";
  });

  const setTheme = (mode) => {
    themeMode.value = mode;
  };

  // Apply theme to HTML
  watch(
    theme,
    (newTheme) => {
      document.documentElement.setAttribute("data-theme", newTheme);
    },
    { immediate: true }
  );

  return {
    themeMode,
    theme,
    setTheme,
    modes: ["light", "dark", "auto"],
  };
}
