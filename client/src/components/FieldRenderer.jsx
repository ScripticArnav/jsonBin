import { useEffect, useState } from "react";
import { getByPath } from "../utils/objPath";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function FieldRenderer({ field, values, onChange }) {
  const { name, label, type, options, api, apiTitle, array, subFields, saveTo } = field;
  const value = getByPath(values, name) ?? (array ? [] : "");

  const [apiOptions, setApiOptions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Helper function to infer backend endpoint from API URL
  function getBackendEndpoint(apiUrl) {
    if (saveTo) {
      // If saveTo is explicitly provided, use it
      return saveTo.startsWith("/") ? saveTo : `/${saveTo}`;
    }
    
    try {
      const url = new URL(apiUrl);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        const entityName = pathParts[pathParts.length - 1];
        // Pluralize: user -> users, material -> materials
        const plural = entityName.endsWith("s") ? entityName : `${entityName}s`;
        return `/api/${plural}`;
      }
    } catch (e) {
      console.warn("Could not parse API URL:", apiUrl);
    }
    return null;
  }

  // Function to save fetched data to backend database
  async function saveToDatabase(items, backendEndpoint) {
    if (!backendEndpoint || !Array.isArray(items) || items.length === 0) {
      return;
    }

    setSaving(true);
    try {
      // First, fetch existing items from our database to check for duplicates
      const existingRes = await fetch(`${API_BASE}${backendEndpoint}`);
      let existingItems = [];
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        existingItems = Array.isArray(existingData) ? existingData : [];
      }

      // Create a set of existing identifiers for quick lookup
      const existingIds = new Set();
      const existingEmails = new Set();
      const existingPhones = new Set();
      
      existingItems.forEach(item => {
        if (item.id) existingIds.add(String(item.id));
        if (item._id) existingIds.add(String(item._id));
        if (item.email) existingEmails.add(String(item.email).toLowerCase());
        if (item.emailId) existingEmails.add(String(item.emailId).toLowerCase());
        if (item.phone) existingPhones.add(String(item.phone));
      });

      // Save each item that doesn't already exist
      let savedCount = 0;
      for (const item of items) {
        // Check if item already exists
        const itemId = String(item.id || item._id || item.userId || "");
        const itemEmail = item.email || item.emailId || "";
        const itemPhone = item.phone || "";
        
        const exists = 
          (itemId && existingIds.has(itemId)) ||
          (itemEmail && existingEmails.has(String(itemEmail).toLowerCase())) ||
          (itemPhone && existingPhones.has(String(itemPhone)));

        if (!exists) {
          try {
            const saveRes = await fetch(`${API_BASE}${backendEndpoint}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
            
            if (saveRes.ok) {
              savedCount++;
              const saved = await saveRes.json();
              // Add to existing set to avoid duplicate saves in same batch
              if (saved.id) existingIds.add(String(saved.id));
              if (saved._id) existingIds.add(String(saved._id));
              if (saved.email) existingEmails.add(String(saved.email).toLowerCase());
              if (saved.emailId) existingEmails.add(String(saved.emailId).toLowerCase());
              if (saved.phone) existingPhones.add(String(saved.phone));
            } else {
              const errorData = await saveRes.json().catch(() => ({}));
              // If it's a duplicate error (like email already exists), skip it
              if (saveRes.status !== 400 && saveRes.status !== 409) {
                console.warn(`Failed to save item to ${backendEndpoint}:`, errorData);
              }
            }
          } catch (err) {
            console.warn(`Error saving item to ${backendEndpoint}:`, err);
          }
        }
      }

      if (savedCount > 0) {
        console.log(`Saved ${savedCount} new items to ${backendEndpoint}`);
      }
    } catch (err) {
      console.warn("Error saving to database:", err);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function loadApi() {
      if (!api || type !== "dropdown") return;
      try {
        const res = await fetch(api);
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.items || data.record || data.data || [];
        if (!mounted) return;
        setApiOptions(list);

        // Save fetched data to database
        if (list.length > 0) {
          const backendEndpoint = getBackendEndpoint(api);
          if (backendEndpoint) {
            await saveToDatabase(list, backendEndpoint);
          }
        }
      } catch (e) {
        console.warn("Failed to load options", e);
      }
    }
    loadApi();
    return () => (mounted = false);
  }, [api, type]);

  function change(v) {
    onChange(name, v);
  }

  // helper: choose options (static > api)
  const resolvedOptions =
    Array.isArray(options) && options.length
      ? options
      : apiOptions.map((o) => {
          // Keep objects intact for dropdown rendering
          if (typeof o === "object" && o !== null) {
            return {
              value: o.id ?? o.value ?? o._id ?? o.userId ?? o[apiTitle],
              label: apiTitle ? (o[apiTitle] ?? o.name ?? o.label ?? JSON.stringify(o)) : (o.name ?? o.label ?? JSON.stringify(o)),
              raw: o
            };
          }
          return o;
        });

  // upload helper (image/file)
  async function handleUploadFile(file) {
    if (!field.uploadApi) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(field.uploadApi, { method: "POST", body: fd });
      const json = await res.json();
      const url = json.url || json.data?.url || json.record?.url || json.path;
      if (url) change(url);
    } catch (e) {
      console.error("upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  switch (type) {
    case "textarea":
      return (
        <textarea 
          value={value} 
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            minHeight: "100px",
            resize: "vertical",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "inherit",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => change(e.target.valueAsNumber)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "email":
      return (
        <input
          type="email"
          value={value ?? ""}
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "phone":
      return (
        <input
          type="tel"
          value={value ?? ""}
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );

    case "password":
      return (
        <label>
          {label}
          <input
            type="password"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "boolean":
      return (
        <label>
          {label}
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => change(e.target.checked)}
          />
        </label>
      );

    case "Date":
      return (
        <label>
          {label}
          <input
            type="date"
            value={value ? String(value).split("T")[0] : ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "Time":
      return (
        <label>
          {label}
          <input
            type="time"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "DateTime":
      return (
        <label>
          {label}
          <input
            type="datetime-local"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
          />
        </label>
      );

    case "dropdown": {
      return (
        <div style={{ position: "relative", width: "100%" }}>
          <select 
            value={value ?? ""} 
            onChange={(e) => change(e.target.value)}
            disabled={saving}
            style={{
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              width: "100%",
              boxSizing: "border-box",
              background: saving ? "#f5f5f5" : "white",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "border-color 0.2s",
              opacity: saving ? 0.7 : 1
            }}
            onFocus={(e) => e.target.style.borderColor = "#007bff"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          >
            <option value="">— select —</option>
            {resolvedOptions.map((opt, i) => {
              if (typeof opt === "object" && opt !== null) {
                const optValue = opt.value ?? opt.id ?? opt._id ?? opt.userId ?? opt[apiTitle];
                const optLabel = opt.label ?? opt.name ?? opt[apiTitle] ?? JSON.stringify(opt);
                return (
                  <option key={i} value={optValue ?? ""}>
                    {optLabel}
                  </option>
                );
              }
              return (
                <option key={i} value={String(opt)}>
                  {String(opt)}
                </option>
              );
            })}
          </select>
          {saving && (
            <div style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "12px",
              color: "#007bff"
            }}>
              Saving...
            </div>
          )}
        </div>
      );
    }

    case "checkbox": {
      // multi-select when array=true
      if (array || field.array === "true") {
        const selected = Array.isArray(value) ? value : [];
        const opts = resolvedOptions;
        const toggle = (v) => {
          const next = selected.includes(v)
            ? selected.filter((x) => x !== v)
            : [...selected, v];
          change(next);
        };
        return (
          <div>
            <div>{label}</div>
            {opts.map((opt, i) => {
              const v =
                typeof opt === "object"
                  ? opt.value ?? opt[apiTitle] ?? opt.id
                  : opt;
              return (
                <label key={i} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(v)}
                    onChange={() => toggle(v)}
                  />
                  {typeof opt === "object"
                    ? opt.label ?? opt[apiTitle] ?? v
                    : v}
                </label>
              );
            })}
          </div>
        );
      }
      // fallback single checkbox handled as boolean
      return (
        <label>
          {label}
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => change(e.target.checked)}
          />
        </label>
      );
    }

    case "tags": {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div>
          <div>{label}</div>
          <div>
            {arr.map((t, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  padding: 4,
                  margin: 4,
                  border: "1px solid #ccc",
                }}
              >
                {t}{" "}
                <button onClick={() => change(arr.filter((x) => x !== t))}>
                  x
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
          />
          <button
            onClick={() => {
              if (!tagInput) return;
              change([...arr, tagInput]);
              setTagInput("");
            }}
          >
            Add
          </button>
        </div>
      );
    }

    case "imageLink":
    case "file": {
      return (
        <div>
          <label>{label}</label>
          <div>
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => change(e.target.value)}
              placeholder="paste url"
            />
          </div>
          <div>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f);
              }}
            />
            {uploading ? <span>Uploading...</span> : null}
          </div>
          {value ? (
            <div style={{ marginTop: 8 }}>
              {type === "imageLink" ? (
                <img src={value} alt="preview" style={{ maxWidth: 180 }} />
              ) : (
                <a href={value}>{value}</a>
              )}
            </div>
          ) : null}
        </div>
      );
    }

    case "subString":
    case "safetychecks":
    case "permitchecklists": {
      const arr = Array.isArray(value) ? value : [];
      function updateItem(idx, key, v) {
        const copy = arr.slice();
        if (!copy[idx]) copy[idx] = {};
        copy[idx][key] = v;
        change(copy);
      }
      function addRow() {
        change([...arr, {}]);
      }
      function removeRow(i) {
        const copy = arr.slice();
        copy.splice(i, 1);
        change(copy);
      }
      return (
        <div>
          <button 
            type="button"
            onClick={addRow}
            style={{
              padding: "8px 16px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "12px",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.target.style.background = "#218838"}
            onMouseOut={(e) => e.target.style.background = "#28a745"}
          >
            + Add Item
          </button>
          {arr.map((row, i) => (
            <div
              key={i}
              style={{ 
                border: "1px solid #e0e0e0", 
                padding: "16px", 
                marginBottom: "12px",
                borderRadius: "6px",
                background: "#fafafa"
              }}
            >
              {subFields?.map((sf) => (
                <div key={sf.field} style={{ marginBottom: "12px" }}>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#555"
                  }}>
                    {sf.label}
                  </label>
                  <input
                    value={row[sf.field] ?? ""}
                    onChange={(e) => updateItem(i, sf.field, e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              ))}
              <button 
                type="button"
                onClick={() => removeRow(i)}
                style={{
                  padding: "6px 12px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#c82333"}
                onMouseOut={(e) => e.target.style.background = "#dc3545"}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      );
    }

    case "geolocation": {
      function getLocation() {
        if (!navigator.geolocation) {
          alert("Geolocation not supported in this browser");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const val = `${latitude},${longitude}`;
            change(val);
          },
          (err) => {
            console.error("Geo error:", err);
            alert("Failed to get location");
          }
        );
      }

      return (
        <div>
          <label>{label}</label>

          {/* Manual override input */}
          <input
            type="text"
            placeholder="lat,lng"
            value={value ?? ""}
            onChange={(e) => change(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />

          {/* Get location button */}
          <button type="button" onClick={getLocation}>
            Get Location
          </button>

          {/* Show Map Preview */}
          {value && (
            <div style={{ marginTop: 10 }}>
              <iframe
                width="100%"
                height="180"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps?q=${value}&output=embed`}
              ></iframe>
            </div>
          )}
        </div>
      );
    }

    default:
      return (
        <input 
          value={value ?? ""} 
          onChange={(e) => change(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            transition: "border-color 0.2s",
            width: "100%",
            boxSizing: "border-box"
          }}
          onFocus={(e) => e.target.style.borderColor = "#007bff"}
          onBlur={(e) => e.target.style.borderColor = "#ddd"}
        />
      );
  }
}