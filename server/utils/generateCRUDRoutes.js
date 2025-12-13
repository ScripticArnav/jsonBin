import express from "express";

function flattenObject(obj, prefix = "", res = {}) {
  for (const key of Object.keys(obj || {})) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      flattenObject(val, newKey, res);
    } else {
      res[newKey] = val;
    }
  }
  return res;
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k] !== undefined ? obj[k] : "";
  return out;
}

function toCSV(rows, headers) {
  // Escape cell and join with commas, return CSV string with header row
  const escape = (value) => {
    if (value === null || value === undefined) return "";
    // convert arrays/objects/dates to sensible string
    if (Array.isArray(value)) value = value.join("; ");
    if (value instanceof Date) value = value.toISOString();
    if (typeof value === "object") value = JSON.stringify(value);
    let s = String(value);
    // double quotes inside cell -> ""
    s = s.replace(/"/g, '""');
    // if cell contains comma, newline or quote, wrap in quotes
    if (/[",\n\r]/.test(s)) s = `"${s}"`;
    return s;
  };

  const lines = [];
  // header
  lines.push(headers.map(escape).join(","));
  for (const row of rows) {
    const line = headers.map((h) => escape(row[h]));
    lines.push(line.join(","));
  }
  return lines.join("\r\n");
}

export default function generateCRUDRoutes(Model) {
  const router = express.Router();

  // CREATE
  router.post("/", async (req, res) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // EXPORT -> POST /export
  // Body: { filter: {...}, fields: ["a","b.c"], filename: "myfile.csv" }
  // If fields omitted, CSV headers are derived from returned documents (flattened keys).
  router.post("/export", async (req, res) => {
    try {
      const { filter = {}, fields, filename = "export.csv", limit, sort } = req.body || {};

      // Basic find; you can pass any Mongo filter in the body.
      let query = Model.find(filter).lean();
      if (sort) query = query.sort(sort);
      if (typeof limit === "number") query = query.limit(limit);

      const docs = await query.exec();

      // Flatten documents and collect headers
      const flatDocs = docs.map((d) => flattenObject(d));

      let headers = [];
      if (Array.isArray(fields) && fields.length > 0) {
        headers = fields;
      } else {
        // derive union of all keys
        const keySet = new Set();
        for (const d of flatDocs) {
          for (const k of Object.keys(d)) keySet.add(k);
        }
        headers = Array.from(keySet).sort();
      }

      // Build rows by picking header order
      const rows = flatDocs.map((d) => pick(d, headers));

      const csv = toCSV(rows, headers);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      // optional: set utf-8 BOM so Excel recognizes encoding
      res.send("\uFEFF" + csv);
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // READ - LIST ALL
  router.get("/", async (req, res) => {
    try {
      const docs = await Model.find();
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // READ - SINGLE BY ID
  router.get("/:id", async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE
  router.put("/:id", async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
      if (!doc) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE
  router.delete("/:id", async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json({ message: "Deleted", data: doc });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
