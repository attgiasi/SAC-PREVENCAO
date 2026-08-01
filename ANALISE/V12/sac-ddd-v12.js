(function SACDddV12Factory() {
  "use strict";

  if (window.SACDddV12) return;

  const ENGINE_VERSION = "1.0.0";
  const REGION_BY_UF = Object.freeze({
    AC: "Norte", AL: "Nordeste", AP: "Norte", AM: "Norte", BA: "Nordeste",
    CE: "Nordeste", DF: "Centro-Oeste", ES: "Sudeste", GO: "Centro-Oeste",
    MA: "Nordeste", MT: "Centro-Oeste", MS: "Centro-Oeste", MG: "Sudeste",
    PA: "Norte", PB: "Nordeste", PR: "Sul", PE: "Nordeste", PI: "Nordeste",
    RJ: "Sudeste", RN: "Nordeste", RS: "Sul", RO: "Norte", RR: "Norte",
    SC: "Sul", SP: "Sudeste", SE: "Nordeste", TO: "Norte"
  });
  const UF_BY_DDD = Object.freeze({
    11: "SP", 12: "SP", 13: "SP", 14: "SP", 15: "SP", 16: "SP", 17: "SP", 18: "SP", 19: "SP",
    21: "RJ", 22: "RJ", 24: "RJ", 27: "ES", 28: "ES",
    31: "MG", 32: "MG", 33: "MG", 34: "MG", 35: "MG", 37: "MG", 38: "MG",
    41: "PR", 42: "PR", 43: "PR", 44: "PR", 45: "PR", 46: "PR",
    47: "SC", 48: "SC", 49: "SC", 51: "RS", 53: "RS", 54: "RS", 55: "RS",
    61: "DF", 62: "GO", 63: "TO", 64: "GO", 65: "MT", 66: "MT", 67: "MS", 68: "AC", 69: "RO",
    71: "BA", 73: "BA", 74: "BA", 75: "BA", 77: "BA", 79: "SE",
    81: "PE", 82: "AL", 83: "PB", 84: "RN", 85: "CE", 86: "PI", 87: "PE", 88: "CE", 89: "PI",
    91: "PA", 92: "AM", 93: "PA", 94: "PA", 95: "RR", 96: "AP", 97: "AM", 98: "MA", 99: "MA"
  });

  function digits(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function extractDdd(value) {
    const number = digits(value).replace(/^55(?=\d{10,11}$)/, "");
    if (number.length < 10) return "";
    const ddd = number.slice(0, 2);
    return UF_BY_DDD[Number(ddd)] ? ddd : "";
  }

  function lookup(value) {
    const ddd = /^\d{2}$/.test(String(value || "")) ? String(value) : extractDdd(value);
    const uf = UF_BY_DDD[Number(ddd)] || "";
    return Object.freeze({
      found: Boolean(uf),
      ddd,
      uf,
      region: REGION_BY_UF[uf] || "",
      label: uf ? `DDD ${ddd} - ${uf} - ${REGION_BY_UF[uf]}` : "DDD não identificado"
    });
  }

  function bemolAssessment(value) {
    const ddd = typeof value === "object" && value ? value : lookup(value);
    if (!ddd?.found) {
      return Object.freeze({ status: "REVIEW", severity: "warning", label: "CONFIRMAR DDD", reason: "A Bemol exige confirmação de DDD da região Norte." });
    }
    if (ddd.region !== "Norte") {
      return Object.freeze({ status: "ALERT", severity: "danger", label: "DDD FORA DA REGIÃO NORTE", reason: `O ${ddd.label} não pertence à região Norte, perfil esperado da Bemol.` });
    }
    return Object.freeze({ status: "MATCH", severity: "success", label: "DDD COMPATÍVEL COM A BEMOL", reason: `${ddd.label} pertence à região Norte.` });
  }

  window.SACDddV12 = Object.freeze({
    version: ENGINE_VERSION,
    extractDdd,
    lookup,
    bemolAssessment
  });
})();
