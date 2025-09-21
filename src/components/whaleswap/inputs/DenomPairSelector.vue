<template>
  <div class="grid gap-2 md:grid-cols-2">
    <AmountDenomSelector
      :base-denoms="baseDenoms"
      :default-base-denom="defaultBaseA"
      v-model:base="a"
      v-model:display="aDisplay"
    />
    <AmountDenomSelector
      :base-denoms="baseDenoms"
      :default-base-denom="defaultBaseB"
      v-model:base="b"
      v-model:display="bDisplay"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import AmountDenomSelector from '@/components/AmountDenomSelector.vue'

const props = defineProps({
  baseDenoms: { type: Array, default: () => [] },
  defaultBaseA: { type: String, default: '' },
  defaultBaseB: { type: String, default: '' },
  modelValue: {
    type: Object,
    default: () => ({ a: { amount: '', denom: '' }, b: { amount: '', denom: '' } }),
  },
})
const emit = defineEmits(['update:modelValue'])

const a = ref({ amount: '', denom: '' })
const b = ref({ amount: '', denom: '' })
const aDisplay = ref({ amount: '', denom: '' })
const bDisplay = ref({ amount: '', denom: '' })

watch([a, b], () => emit('update:modelValue', { a: a.value, b: b.value }), { deep: true })
watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    a.value = v.a || { amount: '', denom: '' }
    b.value = v.b || { amount: '', denom: '' }
  },
  { immediate: true, deep: true }
)
</script>
