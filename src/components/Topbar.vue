<template>
  <div
    role="navigation"
    aria-label="Navbar"
    class="flex items-center justify-between px-3"
    id="layout-topbar"
  >
    <div class="inline-flex items-center gap-3">
      <label
        for="layout-sidebar-toggle-trigger"
        class="btn btn-square btn-ghost btn-sm"
        aria-label="Menu"
      >
        <span class="iconify lucide--menu size-5"></span>
      </label>
      <button
        class="btn btn-outline btn-sm btn-ghost border-base-300 text-base-content/70 hidden h-9 w-48 justify-start gap-2 !text-sm md:flex"
      >
        <span class="iconify lucide--search size-4"></span>
        <span>Search</span>
      </button>
    </div>
    <div class="inline-flex items-center gap-1">
      <button aria-label="Toggle Theme" class="btn btn-sm btn-circle btn-ghost">
        <span class="iconify lucide--sun size-4.5"></span>
      </button>
      <button class="btn btn-circle btn-ghost btn-sm" aria-label="Notifications">
        <span class="iconify lucide--bell size-4.5"></span>
      </button>
      <div class="avatar placeholder">
        <div class="bg-base-200 mask mask-squircle w-8">
          <div class="text-xs flex h-full w-full items-center justify-center">JD</div>
        </div>
      </div>
    </div>
  </div>
</template>
