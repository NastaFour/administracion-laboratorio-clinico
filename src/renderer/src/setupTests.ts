import '@testing-library/jest-dom/vitest'

// recharts (dashboard charts) requires ResizeObserver in jsdom; a no-op stub
// is enough for render-level assertions.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub
}

// jsdom reports 0×0 for getBoundingClientRect, which makes recharts'
// ResponsiveContainer measure a zero-size chart and render nothing. Report a
// sane fixed size so chart SVGs actually render in tests.
Element.prototype.getBoundingClientRect = () =>
  ({ width: 400, height: 256, top: 0, left: 0, right: 400, bottom: 256, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect