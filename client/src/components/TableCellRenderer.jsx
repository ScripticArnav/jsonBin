import { getByPath } from "../utils/objPath";

export default function TableCellRenderer({ row, column }) {
  const { accessor, type } = column;
  const raw = getByPath(row, accessor);

  switch (type) {
    case "imageLink":
      return raw ? <img src={raw} alt="" style={{ width: 64 }} /> : null;

    case "textarea": {
      const s = String(raw ?? "");
      return s.length > 80 ? s.slice(0, 80) + "…" : s;
    }

    case "Date": {
      if (!raw) return "";
      const d = new Date(raw);
      return d.toLocaleDateString();
    }

    case "DateTime": {
      if (!raw) return "";
      const d = new Date(raw);
      return d.toLocaleString();
    }

    case "checkbox":
      return Array.isArray(raw) ? raw.join(", ") : String(raw ?? "");

    case "boolean":
      return raw ? "Yes" : "No";

    case "number":
      return raw ?? "";

    default:
      return String(raw ?? "");
  }
}
