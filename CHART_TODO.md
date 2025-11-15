# Chart Enhancement TODO

Trader-friendly features for TradingView Lightweight Charts integration.

Current implementation: Basic line series in `src/views/whaleswap/TradeHistoryChart.vue`

---

## Phase 1: MVP Enhancements (Essential)

### ✅ 1. Candlestick Charts with Time Intervals **[COMPLETE]**

**Priority:** HIGH  
**What:** Switch between line/candlestick/area/bar + time intervals (1m, 5m, 15m, 1h, 4h, 1d)

**Implementation:**

```typescript
const chartType = ref<'line' | 'candlestick' | 'area' | 'bar'>('candlestick')
const interval = ref<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'>('5m')

function aggregateToCandles(trades: Trade[], intervalSec: number) {
  const buckets = new Map()
  trades.forEach((trade) => {
    const bucketTime = Math.floor(trade.time / intervalSec) * intervalSec
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, {
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
      })
    }
    const candle = buckets.get(bucketTime)
    candle.high = Math.max(candle.high, trade.price)
    candle.low = Math.min(candle.low, trade.price)
    candle.close = trade.price
  })
  return Array.from(buckets.entries()).map(([time, ohlc]) => ({ time, ...ohlc }))
}

// Dynamic series creation
if (chartType.value === 'candlestick') {
  series = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  })
}
```

**UI:** Buttons/dropdown above chart for type + interval selection

---

### ✅ 2. Volume Histogram Overlay

**Priority:** HIGH  
**What:** Show trading volume as histogram below price chart

**Implementation:**

```typescript
const volumeData = computed(() => {
  const buckets = new Map()
  for (const trade of props.trades) {
    const timeWindow = Math.floor(trade.timestamp / 300) * 300 // 5min
    const volume = buckets.get(timeWindow) || 0
    buckets.set(timeWindow, volume + Number(trade.amount))
  }
  return Array.from(buckets.entries()).map(([time, volume]) => ({
    time,
    value: volume,
    color: volume > prevVolume ? '#26a69a' : '#ef5350',
  }))
})

volumeSeries = chart.addHistogramSeries({
  color: '#26a69a',
  priceFormat: { type: 'volume' },
  priceScaleId: 'volume',
})

chart.priceScale('volume').applyOptions({
  scaleMargins: { top: 0.8, bottom: 0 },
})
```

**Notes:** Volume colored green/red based on price direction

---

### ✅ 3. User Trade Markers

**Priority:** HIGH  
**What:** Show markers on chart for current wallet's executed trades

**Implementation:**

```typescript
const userTrades = computed(() => props.trades.filter((t) => t.trader === wallet.address))

// Add markers to series
series.setMarkers(
  userTrades.value.map((trade) => ({
    time: trade.timestamp,
    position: trade.isBuy ? 'belowBar' : 'aboveBar',
    color: trade.isBuy ? '#26a69a' : '#ef5350',
    shape: trade.isBuy ? 'arrowUp' : 'arrowDown',
    text: `${trade.amount} @ ${trade.price}`,
  }))
)
```

**UI:** Toggle button to show/hide user markers

---

### ✅ 4. Real-time Updates

**Priority:** HIGH  
**What:** Live price updates without manual refresh

**Implementation:**

```typescript
const { data: latestTrades } = useWhaleswapTradesByPool(poolId, {
  limit: '10',
  options: { refetchInterval: 5000 }, // poll every 5s
})

watch(latestTrades, (newTrades) => {
  if (!newTrades?.length) return
  const newPoints = processTradesForChart(newTrades)
  // Incremental update
  series.update(newPoints[newPoints.length - 1])
})
```

**Notes:** Use TanStack Query refetchInterval; consider WebSocket later

---

### ✅ 5. Mobile Touch Controls

**Priority:** HIGH  
**What:** Pinch-to-zoom, swipe-to-scroll for mobile users

**Implementation:**

```typescript
chart.applyOptions({
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    axisPressedMouseMove: true,
    mouseWheel: true,
    pinch: true,
  },
})
```

**Testing:** Verify on mobile browsers (iOS Safari, Android Chrome)

---

## Phase 2: Pro Features (Enhanced UX)

### ⬜ 6. Crosshair with Price/Time Display

**Priority:** MEDIUM  
**What:** Hover to see exact price/time at any point

**Implementation:**

```typescript
chart.applyOptions({
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: 'rgba(255, 255, 255, 0.5)',
      labelBackgroundColor: '#2962ff',
    },
    horzLine: {
      color: 'rgba(255, 255, 255, 0.5)',
      labelBackgroundColor: '#2962ff',
    },
  },
})

// Custom tooltip
chart.subscribeCrosshairMove((param) => {
  if (param.time) {
    const data = param.seriesData.get(series)
    tooltipPrice.value = data?.value
    tooltipTime.value = param.time
  }
})
```

**UI:** Floating tooltip div following crosshair

---

### ⬜ 7. Price Alerts / Horizontal Lines

**Priority:** MEDIUM  
**What:** Set visual price targets on chart

**Implementation:**

```typescript
const priceAlerts = ref<number[]>([])

function addPriceAlert(price: number) {
  priceAlerts.value.push(price)
  series.createPriceLine({
    price,
    color: '#ffeb3b',
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: 'Alert',
  })
}
```

**UI:** Right-click menu or input field to add alert at price

---

### ⬜ 8. Basic Technical Indicators

**Priority:** MEDIUM  
**What:** SMA (Simple Moving Average), EMA (Exponential Moving Average)

**Implementation:**

```typescript
function calculateSMA(data: PriceData[], period: number) {
  return data
    .map((_, idx, arr) => {
      if (idx < period - 1) return null
      const sum = arr.slice(idx - period + 1, idx + 1).reduce((acc, d) => acc + d.value, 0)
      return { time: arr[idx].time, value: sum / period }
    })
    .filter(Boolean)
}

const sma20 = computed(() => calculateSMA(chartData.value, 20))
const sma50 = computed(() => calculateSMA(chartData.value, 50))

const smaSeries20 = chart.addLineSeries({
  color: 'rgba(255, 152, 0, 0.8)',
  lineWidth: 1,
  title: 'SMA 20',
})
smaSeries20.setData(sma20.value)
```

**UI:** Dropdown to enable/disable indicators, configure periods

---

### ⬜ 9. Price Scale Modes

**Priority:** MEDIUM  
**What:** Toggle between linear and logarithmic scale

**Implementation:**

```typescript
const priceScaleMode = ref<'normal' | 'logarithmic'>('normal')

chart.priceScale('right').applyOptions({
  mode: priceScaleMode.value === 'logarithmic' ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
  autoScale: true,
  alignLabels: true,
  borderVisible: false,
})
```

**UI:** Toggle button in chart toolbar

---

## Phase 3: Advanced Features (Power Users)

### ⬜ 10. Drawing Tools

**Priority:** LOW  
**What:** Trend lines, horizontal lines, rectangles

**Implementation:**

```typescript
// Option 1: Simple lines using LineSeries
const trendLine = chart.addLineSeries({
  color: 'rgba(255, 255, 255, 0.5)',
  lineWidth: 1,
  priceLineVisible: false,
})
trendLine.setData([
  { time: startTime, value: startPrice },
  { time: endTime, value: endPrice },
])

// Option 2: Canvas overlay + mouse event handling (complex)
// Requires custom drawing logic on separate canvas layer
```

**Notes:** Lightweight Charts lacks built-in drawing tools; consider TradingView full library or custom implementation

---

### ⬜ 11. Advanced Indicators (RSI, MACD, Bollinger Bands)

**Priority:** LOW  
**What:** Popular technical indicators in separate panes

**Implementation:**

```typescript
// RSI example - requires separate pane
function calculateRSI(data: PriceData[], period: number = 14) {
  const gains = []
  const losses = []
  for (let i = 1; i < data.length; i++) {
    const change = data[i].value - data[i - 1].value
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? -change : 0)
  }
  // ... average gain/loss calculation
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

const rsiSeries = chart.addLineSeries({
  color: '#9C27B0',
  priceScaleId: 'rsi',
})

chart.priceScale('rsi').applyOptions({
  scaleMargins: { top: 0.85, bottom: 0 },
})
```

**UI:** Multi-pane layout with add/remove indicator controls

---

### ⬜ 12. Export Chart as Image

**Priority:** LOW  
**What:** Download chart as PNG for sharing

**Implementation:**

```typescript
function exportChart() {
  chart.takeScreenshot().then((canvas) => {
    const link = document.createElement('a')
    link.download = `whaleswap-chart-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  })
}
```

**UI:** Button in chart toolbar

---

### ⬜ 13. Comparison Mode (Multi-Symbol)

**Priority:** LOW  
**What:** Compare multiple pools on same chart

**Implementation:**

```typescript
const series1 = chart.addLineSeries({ color: '#2962ff', title: 'Pool 1' })
const series2 = chart.addLineSeries({ color: '#ff6d00', title: 'Pool 2' })

// Normalize to percentage change from first point
function normalizeToPercent(data: PriceData[]) {
  const base = data[0].value
  return data.map((d) => ({
    time: d.time,
    value: ((d.value - base) / base) * 100,
  }))
}
```

**UI:** Add pool selector, enable comparison toggle

---

### ⬜ 14. Saved Layouts (Zoom/Position Memory)

**Priority:** LOW  
**What:** Remember chart zoom and position across sessions

**Implementation:**

```typescript
// Save visible range to localStorage
chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
  localStorage.setItem(`chart-range-${poolId}`, JSON.stringify(range))
})

// Restore on mount
onMounted(() => {
  const savedRange = localStorage.getItem(`chart-range-${poolId}`)
  if (savedRange) {
    chart.timeScale().setVisibleRange(JSON.parse(savedRange))
  }
})
```

---

## Implementation Notes

### Coding Principles (per project rules)

- Let errors bubble up - no try/catch blocks
- Minimal code - prioritize simplicity over abstraction
- No defensive programming - trust the API
- Use plain JS variables for chart instances (not Vue refs)
- Intersperse console.log during development

### Performance Considerations

- Limit displayed trades to last 1000 for large datasets
- Use computed() for derived chart data
- Debounce real-time updates if polling < 5s
- Don't initialize chart until container has dimensions

### Testing

- Test on mobile (touch controls, responsive sizing)
- Verify with pools that have sparse data (few trades)
- Test with extreme price ranges (very high/low values)
- Verify memory cleanup in onUnmounted hook

### References

- Lightweight Charts API: https://tradingview.github.io/lightweight-charts/docs/api
- Current implementation: `src/views/whaleswap/TradeHistoryChart.vue`
- Pool detail spec: `src/whaleswap/docs/POOL-SPEC.md`
