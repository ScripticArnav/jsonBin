// export default function EntityTable({ columns, data, onEdit, onDelete }) {
//   return (
//     <table
//       style={{
//         borderCollapse: "collapse",
//         width: "100%",
//         marginTop: "20px"
//       }}
//     >
//       <thead>
//         <tr>
//           {columns.map((col) => (
//             <th
//               key={col.accessor}
//               style={{
//                 border: "1px solid #ddd",
//                 padding: "8px",
//                 background: "#f5f5f5",
//                 textAlign: "left"
//               }}
//             >
//               {col.header}
//             </th>
//           ))}
//           {(onEdit || onDelete) && (
//             <th
//               style={{
//                 border: "1px solid #ddd",
//                 padding: "8px",
//                 background: "#f5f5f5"
//               }}
//             >
//               Actions
//             </th>
//           )}
//         </tr>
//       </thead>
//       <tbody>
//         {data.map((row) => (
//           <tr key={row.id || row.orderId || row.code}>
//             {columns.map((col) => (
//               <td
//                 key={col.accessor}
//                 style={{
//                   border: "1px solid #eee",
//                   padding: "8px"
//                 }}
//               >
//                 {row[col.accessor]}
//               </td>
//             ))}
//             {(onEdit || onDelete) && (
//               <td
//                 style={{
//                   border: "1px solid #eee",
//                   padding: "8px"
//                 }}
//               >
//                 <div style={{ display: "flex", gap: "8px" }}>
//                   {onEdit && (
//                     <button onClick={() => onEdit(row)}>Edit</button>
//                   )}
//                   {onDelete && (
//                     <button
//                       onClick={() => onDelete(row)}
//                       style={{
//                         backgroundColor: "#dc3545",
//                         color: "white",
//                         border: "none",
//                         padding: "4px 8px",
//                         cursor: "pointer",
//                         borderRadius: "4px"
//                       }}
//                     >
//                       Delete
//                     </button>
//                   )}
//                 </div>
//               </td>
//             )}
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// }

// import TableCellRenderer from "../components/TableCellRenderer";

// <td>{<TableCellRenderer row={row} column={col} />}</td>

// src/components/TableCellRenderer.jsx
// import React from "react";
// import { getByPath } from "../utils/objPath";

// /**
//  * Props:
//  *  - row: object (the data row)
//  *  - column: { header, accessor, type, apiTitle, ... }
//  *
//  * This component uses a switch on column.type to decide how to render.
//  * If column.type is not provided, it falls back to plain string.
//  */

// // function TableCellRenderer({ row, column }) {
// //   const { accessor, type } = column || {};
// //   const raw = getByPath(row || {}, accessor);

// //   switch (type) {
// //     case "imageLink":
// //       return raw ? <img src={raw} alt="" style={{ width: 64, height: "auto" }} /> : null;

// //     case "textarea": {
// //       const s = String(raw ?? "");
// //       return <span title={s}>{s.length > 80 ? s.slice(0, 80) + "…" : s}</span>;
// //     }

// //     case "Date": {
// //       if (!raw) return "";
// //       const d = new Date(raw);
// //       if (isNaN(d)) return String(raw);
// //       return d.toLocaleDateString();
// //     }

// //     case "DateTime": {
// //       if (!raw) return "";
// //       const d = new Date(raw);
// //       if (isNaN(d)) return String(raw);
// //       return d.toLocaleString();
// //     }

// //     case "Time":
// //       return raw ? String(raw) : "";

// //     case "checkbox":
// //       if (Array.isArray(raw)) return raw.join(", ");
// //       return String(raw ?? "");

// //     case "boolean":
// //       return raw ? "Yes" : "No";

// //     case "number":
// //       return raw ?? "";

// //     default:
// //       // fallback: show nested values gracefully, protect against objects/arrays
// //       if (raw == null) return "";
// //       if (typeof raw === "object") return JSON.stringify(raw);
// //       return String(raw);
// //   }
// // }

// // // IMPORTANT: default export (this fixes the "does not provide an export named 'default'" error)
// // export default TableCellRenderer;

// // src/components/EntityTable.jsx
// import React from "react";
// import TableCellRenderer from "./TableCellRenderer";

// /**
//  * Props:
//  *  - columns: [{ header, accessor, type? }]
//  *  - data: array of row objects
//  *  - onEdit(row)
//  *  - onDelete(row)
//  */
// export default function EntityTable({ columns = [], data = [], onEdit, onDelete }) {
//   return (
//     <div style={{ marginTop: 16 }}>
//       <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
//         <table style={{ width: "100%", borderCollapse: "collapse" }}>
//           <thead style={{ background: "#fafafa" }}>
//             <tr>
//               {(columns || []).map((col) => (
//                 <th
//                   key={col.accessor}
//                   style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #eee" }}
//                 >
//                   {col.header}
//                 </th>
//               ))}
//               <th style={{ padding: "8px 12px", borderBottom: "1px solid #eee" }}>Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {(!data || data.length === 0) && (
//               <tr>
//                 <td colSpan={(columns || []).length + 1} style={{ padding: 16 }}>
//                   No data available
//                 </td>
//               </tr>
//             )}

//             {(data || []).map((row, rIndex) => (
//               <tr key={row._id ?? row.id ?? rIndex} style={{ borderTop: "1px solid #f5f5f5" }}>
//                 {(columns || []).map((col) => (
//                   <td key={col.accessor} style={{ padding: "8px 12px", verticalAlign: "top" }}>
//                     <TableCellRenderer row={row} column={col} />
//                   </td>
//                 ))}

//                 <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
//                   <div style={{ display: "flex", gap: 8 }}>
//                     <button onClick={() => onEdit && onEdit(row)}>Edit</button>
//                     <button onClick={() => onDelete && onDelete(row)}>Delete</button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// src/components/EntityTable.jsx
import React from "react";
import TableCellRenderer from "./TableCellRenderer";

/**
 * Props:
 *  - columns: [{ header, accessor, type? }]
 *  - data: array of row objects
 *  - onEdit(row)
 *  - onDelete(row)
 */
export default function EntityTable({ columns = [], data = [], onEdit, onDelete }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#fafafa" }}>
            <tr>
              {(columns || []).map((col) => (
                <th
                  key={col.accessor}
                  style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #eee" }}
                >
                  {col.header}
                </th>
              ))}
              <th style={{ padding: "8px 12px", borderBottom: "1px solid #eee" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={(columns || []).length + 1} style={{ padding: 16 }}>
                  No data available
                </td>
              </tr>
            )}

            {(data || []).map((row, rIndex) => (
              <tr key={row._id ?? row.id ?? rIndex} style={{ borderTop: "1px solid #f5f5f5" }}>
                {(columns || []).map((col) => (
                  <td key={col.accessor} style={{ padding: "8px 12px", verticalAlign: "top" }}>
                    <TableCellRenderer row={row} column={col} />
                  </td>
                ))}

                <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onEdit && onEdit(row)}>Edit</button>
                    <button onClick={() => onDelete && onDelete(row)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
