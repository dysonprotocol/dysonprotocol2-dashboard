import { ref, inject } from "vue";
import { useStorage } from "@vueuse/core";

// Centralized denom utilities: load metadata, convert display<->base, and helpers
export function useDenom() {
  const DEFAULT_CHAIN_INFO = inject("chainInfo", {
    restUrl: "http://localhost:1317",
  });

  // Cache REST url and metadata across sessions
  const restUrl = useStorage("restUrl", DEFAULT_CHAIN_INFO.restUrl);
  const denomMetadatas = ref([]);
  const isLoadingDenoms = ref(false);

  async function loadDenomMetadata() {
    if (Array.isArray(denomMetadatas.value) && denomMetadatas.value.length > 0)
      return;
    isLoadingDenoms.value = true;
    try {
      const url = `${restUrl.value}/cosmos/bank/v1beta1/denoms_metadata?pagination.limit=1000`;
      const resp = await fetch(url);
      if (!resp.ok)
        throw new Error(
          `Failed to load denom metadata: ${resp.status} ${resp.statusText}`
        );
      const json = await resp.json();
      const list = Array.isArray(json?.metadatas) ? json.metadatas : [];
      if (list.length < 1) throw new Error("No denom metadata found");
      denomMetadatas.value = list;
    } finally {
      isLoadingDenoms.value = false;
    }
  }

  async function ensureDenomsLoaded() {
    if (!Array.isArray(denomMetadatas.value) || denomMetadatas.value.length === 0) {
      await loadDenomMetadata();
    }
    return;
  }

  function getDisplayOptions({ allowedBases }) {
    let bases = Array.isArray(allowedBases) ? allowedBases : [];
    // If no allowed bases specified, expose all known base denoms from metadata
    if (bases.length === 0) bases = (denomMetadatas.value || []).map((m) => m.base);

    const options = [];
    for (const base of bases) {
      const md = denomMetadatas.value.find((m) => m.base === base);
      if (!md) {
        options.push({ display: base, name: base, base, exponent: 0 });
        continue;
      }
      const display = md.display || base;
      const displayUnit = (md.denom_units || []).find(
        (u) => u.denom === display || (u.aliases || []).includes(display)
      );
      const exp = displayUnit?.exponent ?? 0;
      options.push({
        display,
        name: md.name || display || base,
        base,
        exponent: exp,
      });
    }
    return options;
  }

  function getDisplayInfoForBase(baseDenom) {
    const md = denomMetadatas.value.find((m) => m.base === baseDenom);
    if (!md) return { display: baseDenom || "", exponent: 0 };
    const display = md.display || baseDenom;
    const displayUnit = (md.denom_units || []).find(
      (u) => u.denom === display || (u.aliases || []).includes(display)
    );
    const exp = displayUnit?.exponent ?? 0;
    return { display, exponent: Number(exp || 0), metadata: md };
  }

  // Accepts display string, returns base amount and metadata
  function normalizeFromDisplay({ amount, displayDenom }) {
    const denom = String(displayDenom || "");
    let metadata = null;
    let displayUnit = null;
    for (const md of denomMetadatas.value) {
      for (const unit of md.denom_units || []) {
        if (unit.denom === denom || (unit.aliases || []).includes(denom)) {
          metadata = md;
          displayUnit = unit;
          break;
        }
      }
      if (metadata) break;
    }
    if (!metadata || !displayUnit)
      throw new Error(`Denom metadata not found for ${denom}`);

    const displayExponent = Number(displayUnit.exponent || 0);
    const raw = String(amount ?? "0").trim();
    const hasDot = raw.includes(".");
    const [a, bRaw] = hasDot ? raw.split(".") : [raw, ""];
    const integerPart = a || "0";
    const fractionalPart = (bRaw || "").slice(0, displayExponent);
    const pad = Math.max(0, displayExponent - fractionalPart.length);
    const baseAmountStr = integerPart + (fractionalPart + "0".repeat(pad));
    const baseAmount = BigInt(baseAmountStr || "0");

    const baseDenom = metadata.base;
    const displayDenomResolved = metadata.display;
    const displayAmount =
      displayExponent > 0
        ? (baseAmount / 10n ** BigInt(displayExponent)).toString()
        : baseAmount.toString();

    return {
      base: { amount: baseAmount.toString(), denom: baseDenom },
      display: { amount: displayAmount, denom: displayDenomResolved },
      metadata,
    };
  }

  // Accepts a coin in any known unit and converts to base/display
  function normalizeCoin({ amount, denom }) {
    const inputAmount = BigInt(amount);
    let metadata = null;
    let inputUnit = null;
    for (const md of denomMetadatas.value) {
      for (const unit of md.denom_units || []) {
        if (unit.denom === denom || (unit.aliases || []).includes(denom)) {
          metadata = md;
          inputUnit = unit;
          break;
        }
      }
      if (metadata) break;
    }
    if (!metadata) {
      // Fallback: passthrough for unknown denom with exponent 0
      const baseDenom = denom;
      const baseAmount = inputAmount;
      const syntheticMd = {
        base: baseDenom,
        display: baseDenom,
        denom_units: [{ denom: baseDenom, exponent: 0 }],
      };
      return {
        base: { amount: baseAmount.toString(), denom: baseDenom },
        display: { amount: baseAmount.toString(), denom: baseDenom },
        metadata: syntheticMd,
      };
    }

    const inputExponent = Number(inputUnit?.exponent || 0);
    const baseDenom = metadata.base;
    const baseAmount = inputAmount * 10n ** BigInt(inputExponent);

    const displayDenom = metadata.display;
    const displayUnit = (metadata.denom_units || []).find(
      (u) =>
        u.denom === displayDenom || (u.aliases || []).includes(displayDenom)
    );
    if (!displayUnit)
      throw new Error(`Display unit not found for ${displayDenom}`);

    const displayExponent = Number(displayUnit.exponent || 0);
    let displayAmountStr = baseAmount.toString();
    if (displayExponent > 0) {
      const scale = 10n ** BigInt(displayExponent);
      const integerPart = baseAmount / scale;
      const fractionPart = baseAmount % scale;
      if (fractionPart === 0n) displayAmountStr = integerPart.toString();
      else {
        const fractionPadded = fractionPart
          .toString()
          .padStart(displayExponent, "0")
          .replace(/0+$/, "");
        displayAmountStr = `${integerPart.toString()}.${fractionPadded}`;
      }
    }

    return {
      base: { amount: baseAmount.toString(), denom: baseDenom },
      display: { amount: displayAmountStr, denom: displayDenom },
      metadata,
    };
  }

  function baseToDisplay(amountBase, baseDenom) {
    const info = getDisplayInfoForBase(baseDenom);
    const exp = Number(info.exponent || 0);
    const s = String(amountBase || "0");
    if (exp <= 0) return s;
    if (s.length <= exp) {
      const pad = "0".repeat(exp - s.length);
      return `0.${pad}${s}`.replace(/\.0+$/, "");
    }
    const i = s.length - exp;
    return `${s.slice(0, i)}.${s.slice(i)}`.replace(/\.0+$/, "");
  }

  function isValidDisplayAmount(input) {
    const raw = String(input || "").trim();
    return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw);
  }

  return {
    // state
    denomMetadatas,
    isLoadingDenoms,
    // methods
    loadDenomMetadata,
    ensureDenomsLoaded,
    getDisplayOptions,
    getDisplayInfoForBase,
    normalizeFromDisplay,
    normalizeCoin,
    baseToDisplay,
    isValidDisplayAmount,
  };
}
