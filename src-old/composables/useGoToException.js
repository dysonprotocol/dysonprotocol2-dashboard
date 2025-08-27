import { useRoute, useRouter } from "vue-router";

/**
 * Unified go-to-exception handler for script editor and extra code editor.
 * If the exception line is within extra code (lineno > baseLineCount), call highlightLocal.
 * Otherwise, focus the main script editor and deep-link the highlight using route query.
 */
export function useGoToException() {
  const route = useRoute();
  const router = useRouter();

  function goToException({
    exception,
    baseLineCount,
    emitFocus,
    highlightLocal,
  }) {
    if (!exception) return;

    const line = Number(exception.lineno || 1);
    const baseLines = Number(baseLineCount || 0);

    if (
      Number.isFinite(baseLines) &&
      line > baseLines &&
      typeof highlightLocal === "function"
    ) {
      highlightLocal(exception, baseLines);
      return;
    }

    if (typeof emitFocus === "function") emitFocus();

    const rest = { ...route.query };
    delete rest.ex;
    const payload = {
      lineno: exception.lineno,
      col_offset: exception.col_offset,
      end_col_offset: exception.end_col_offset,
      end_lineno: exception.end_lineno,
    };
    router.replace({
      query: {
        ...rest,
        ex: encodeURIComponent(JSON.stringify(payload)),
      },
    });
  }

  return { goToException };
}
