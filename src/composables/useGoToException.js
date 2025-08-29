export function useGoToException() {
  function goToException({ exception, baseLineCount, emitFocus, highlightLocal }) {
    if (!exception) return

    const line = Number(exception.lineno || 1)
    const baseLines = Number(baseLineCount || 0)

    if (Number.isFinite(baseLines) && line > baseLines && typeof highlightLocal === 'function') {
      highlightLocal(exception, baseLines)
      return
    }

    if (typeof emitFocus === 'function') emitFocus()

    const payload = {
      lineno: exception.lineno,
      col_offset: exception.col_offset,
      end_col_offset: exception.end_col_offset,
      end_lineno: exception.end_lineno,
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      let evt
      if (typeof window.CustomEvent === 'function') {
        evt = new window.CustomEvent('dyson:script-exception', { detail: payload })
      } else {
        evt = document.createEvent('Event')
        evt.initEvent('dyson:script-exception', true, true)
        // @ts-ignore attach detail in legacy path
        evt.detail = payload
      }
      window.dispatchEvent(evt)
    }
  }

  return { goToException }
}
