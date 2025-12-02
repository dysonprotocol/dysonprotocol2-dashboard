<template>
  <div class="flex items-center justify-center gap-2">
    <template v-for="(step, i) in steps" :key="i">
      <!-- Step tab -->
      <button
        type="button"
        class="flex flex-col items-center cursor-pointer group"
        @click="emit('update:currentStep', i)"
      >
        <div
          class="size-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all duration-200"
          :class="stepClass(i)"
        >
          <span class="iconify" :class="step.icon" />
        </div>
        <span
          class="text-xs mt-2 font-medium transition-colors group-hover:text-primary"
          :class="i === currentStep ? 'text-foreground' : 'text-muted-foreground'"
        >
          {{ step.label }}
        </span>
      </button>

      <!-- Connector line -->
      <div v-if="i < steps.length - 1" class="flex-1 h-0.5 max-w-16 mb-6 bg-border" />
    </template>
  </div>
</template>

<script setup lang="ts">
type Step = { label: string; icon: string }

const props = defineProps<{
  currentStep: number
  steps: Step[]
}>()

const emit = defineEmits<{
  'update:currentStep': [step: number]
}>()

function stepClass(index: number) {
  if (index === props.currentStep) {
    return 'bg-primary text-primary-foreground ring-4 ring-primary/20'
  }
  return 'bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:ring-2 group-hover:ring-primary/20'
}
</script>
