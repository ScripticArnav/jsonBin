const CONFIG_URL =
  import.meta.env.VITE_CONFIG_URL ||
  "https://api.jsonbin.io/v3/b/69411118d0ea881f402cbde2/latest";

async function loadEntityConfig(entityKey, setStatus) {
  try {
    setStatus?.(`Loading ${entityKey} config...`);

    const res = await fetch(CONFIG_URL);
    const raw = await res.json();

    const record = raw.record || raw;

    // Support two shapes:
    // 1) legacy: record.config.<entityKey> -> config used directly
    // 2) combined: record.<entityKey>.frontend -> frontend config
    const entityDef = record[entityKey] || record.config?.[entityKey];
    if (!entityDef) {
      throw new Error(`${entityKey} config not found in JSON`);
    }

    // Prefer frontend block if present
    const cfg = entityDef.frontend || entityDef.config || entityDef;

    // form ke liye initial values
    const initialForm = {};
    (cfg.fields || []).forEach((f) => {
      if (f.type === "checkbox" && !f.array && f.array !== "true") {
        initialForm[f.name] = false;
      } else if (f.type === "checkbox" && (f.array || f.array === "true")) {
        initialForm[f.name] = [];
      } else if (f.type === "subString" || f.type === "safetychecks" || f.type === "permitchecklists" || (f.array || f.array === "true")) {
        initialForm[f.name] = [];
      } else {
        initialForm[f.name] = "";
      }
    });

    setStatus?.("Config loaded");
    return { config: cfg, initialForm };
  } catch (err) {
    console.error(err);
    setStatus?.("Failed to load config: " + err.message);
    throw err;
  }
}
export { loadEntityConfig };