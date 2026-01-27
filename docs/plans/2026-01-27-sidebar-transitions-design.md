# Sidebar Transitions Refactor

## Problem

The sidebar transitions are brittle and cause sudden jumps when:
- Alignment changes (`justify-center` toggle)
- Elements are hidden (`display: none` toggle)
- JavaScript timeouts fall out of sync with CSS durations

## Solution

Replace the JavaScript `contentState` timeout mechanism with a pure CSS-only state machine using `transition-delay` for choreography.

## Architecture

### Core Principle

Single `data-state` attribute (expanded/collapsed) drives all transitions. CSS `transition-delay` creates choreography. No JavaScript timeouts.

### Timing Budget (150ms total)

| Phase | Time | What happens |
|-------|------|--------------|
| Start | 0ms | Sidebar width starts transitioning |
| Phase 1 | 0-50ms | Icons stay in place, text starts fading |
| Phase 2 | 50-100ms | Text fully faded, labels slide up |
| End | 100-150ms | Width transition completes |

### CSS Custom Properties

```css
--sidebar-duration: 100ms;
--sidebar-duration-fast: 75ms;
--sidebar-delay: 50ms;
--sidebar-ease: ease-out;
```

## File Changes

### 1. SidebarProvider.vue

**Remove**:
- `contentState` ref
- `contentStateTimeout` variable
- `watch(state, ...)` with setTimeout logic
- `contentState` from `provideSidebarContext()`
- `data-content-state` attribute from template

**Add**:
- CSS custom properties for timing in the style block

### 2. utils.ts

**Remove**:
- `contentState` from the sidebar context type definition

### 3. index.ts (sidebarMenuButtonVariants)

**Replace**:
```
group-data-[content-state=collapsed]:justify-center
group-data-[content-state=collapsed]:[&>span:last-child]:hidden
```

**With**:
```
[&>span:last-child]:transition-[transform,opacity]
[&>span:last-child]:duration-100
[&>span:last-child]:origin-left
group-data-[state=collapsed]:[&>span:last-child]:scale-x-0
group-data-[state=collapsed]:[&>span:last-child]:opacity-0
```

**Why**: `transform` and `opacity` are GPU-accelerated. Text collapses toward icon with `origin-left`.

### 4. SidebarGroupLabel.vue

**Replace**:
```
transition-[margin,opacity] duration-200 ease-linear
group-data-[state=collapsed]:-mt-8 group-data-[state=collapsed]:opacity-0
```

**With**:
```
transition-[margin,opacity] duration-75 ease-out delay-50
group-data-[state=collapsed]:-mt-8 group-data-[state=collapsed]:opacity-0
```

**Why**: Faster duration (75ms), natural easing, 50ms delay for choreography.

### 5. Sidebar.vue

**Status badge** — Replace `v-if` with CSS opacity:
```vue
<!-- Before -->
<span v-if="isCollapsed" :class="[...]" />

<!-- After -->
<span :class="[
  '... transition-opacity duration-75',
  isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
]" />
```

**Unified timing for header elements**:

| Element | Collapse | Expand |
|---------|----------|--------|
| Logo container | 100ms ease-out | 100ms ease-out |
| Logo text | 75ms ease-out | 75ms ease-out delay-50 |
| Chain status bar | 75ms ease-out | 75ms ease-out delay-50 |
| Footer | 75ms ease-out | 75ms ease-out delay-50 |

**Remove**:
- `contentState` from `useSidebar()` destructuring
- All references to `contentState`

**Update** `isCollapsed` computed:
```javascript
const isCollapsed = computed(() => {
  if (isMobile.value) return !openMobile.value
  return state.value === 'collapsed'
})
```

## Benefits

1. **No jumps** — Only GPU-accelerated properties (transform, opacity) used
2. **Single source of truth** — One `data-state` attribute, no timeout sync issues
3. **Predictable** — All timing visible in CSS, no hidden JavaScript delays
4. **Maintainable** — CSS variables make tuning trivial
5. **Accessible** — `motion-reduce` still works via existing Tailwind classes

## Testing Checklist

- [ ] Collapse animation smooth, no jumps
- [ ] Expand animation smooth, no jumps
- [ ] Rapid toggle (click quickly) doesn't break state
- [ ] Hover-to-expand works correctly
- [ ] Mobile sheet still works
- [ ] Labels hide/show with choreography
- [ ] Menu button text fades smoothly
- [ ] Status badge appears/disappears smoothly
- [ ] `prefers-reduced-motion` disables animations
