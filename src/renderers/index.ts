import {
  rankWith,
  or,
  isStringControl,
  isNumberControl,
  isIntegerControl,
  isBooleanControl,
  isObjectControl,
  isObjectArrayControl,
  isPrimitiveArrayControl,
  uiTypeIs,
} from '@jsonforms/core'

// Custom shadcn-styled renderers
import StringRenderer from './StringRenderer.vue'
import NumberRenderer from './NumberRenderer.vue'
import BooleanRenderer from './BooleanRenderer.vue'
import ObjectRenderer from './ObjectRenderer.vue'
import ArrayRenderer from './ArrayRenderer.vue'
import VerticalLayoutRenderer from './VerticalLayoutRenderer.vue'
import GroupRenderer from './GroupRenderer.vue'

// String control renderer
export const stringRendererEntry = {
  renderer: StringRenderer,
  tester: rankWith(2, isStringControl),
}

// Number control renderer
export const numberRendererEntry = {
  renderer: NumberRenderer,
  tester: rankWith(2, or(isNumberControl, isIntegerControl)),
}

// Boolean control renderer
export const booleanRendererEntry = {
  renderer: BooleanRenderer,
  tester: rankWith(2, isBooleanControl),
}

// Object control renderer (for nested objects like Coin)
export const objectRendererEntry = {
  renderer: ObjectRenderer,
  tester: rankWith(2, isObjectControl),
}

// Array control renderer (for arrays of objects)
export const objectArrayRendererEntry = {
  renderer: ArrayRenderer,
  tester: rankWith(2, isObjectArrayControl),
}

// Array control renderer (for arrays of primitives)
export const primitiveArrayRendererEntry = {
  renderer: ArrayRenderer,
  tester: rankWith(2, isPrimitiveArrayControl),
}

// Vertical layout renderer
export const verticalLayoutRendererEntry = {
  renderer: VerticalLayoutRenderer,
  tester: rankWith(2, uiTypeIs('VerticalLayout')),
}

// Group layout renderer (for labeled object groups)
export const groupRendererEntry = {
  renderer: GroupRenderer,
  tester: rankWith(2, uiTypeIs('Group')),
}

// All custom renderers (shadcn-styled)
export const customRenderers = [
  stringRendererEntry,
  numberRendererEntry,
  booleanRendererEntry,
  objectRendererEntry,
  objectArrayRendererEntry,
  primitiveArrayRendererEntry,
  verticalLayoutRendererEntry,
  groupRendererEntry,
]
