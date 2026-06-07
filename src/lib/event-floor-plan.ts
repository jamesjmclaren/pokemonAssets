// Shared floor-plan definition for The Collectors Exhibition.
// Pure TypeScript (no React) so it can be imported by the client page, the
// checkout/availability API routes, the Stripe webhook, and the admin page.
//
// The grid mirrors the vendor spreadsheet. Each character is one grid cell:
//   2 (blue)  = a single standard table, sold individually (£100)
//   1 (green) = end corner — two tables at a right angle, sold as one unit (£200)
//   3 (red)   = premier corner — two tables at a right angle, sold as one unit (£275)
//   . = empty (aisle / booth interior)
//
// Every sellable unit gets a stable human label: S1.. (standard), E1.. (end
// corner), P1.. (premier). Labels are assigned in reading order, so they stay
// stable as long as FLOOR_GRID is unchanged.

export type TableTypeKey = "standard" | "corner" | "premier_corner";

export interface TableRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TableUnit {
  id: string; // == label, e.g. "S1", "E3", "P12"
  label: string;
  type: TableTypeKey;
  rects: TableRect[]; // the table squares that make up this unit
  cx: number; // where to draw the table number (on a real tile, not the gap)
  cy: number;
}

export const FLOOR_GRID = [
  ".11...11...11...11...11...11......",
  "1..1.1..1.1..1.1..1.1..1.1..1.....",
  "2..2.2..2.2..2.2..2.2..2.2..2.....",
  "2..2.2..2.2..2.2..2.2..2.2..2.....",
  "2..2.2..2.2..2.2..2.2..2.2..2.....",
  "2..2.2..2.2..2.3..3.2..2.2..2..33.",
  "2..2.2..2.2..2..33..2..2.2..2.3..3",
  "2..2.2..2.2..2......2..2.2..2.3..3",
  "3..3.3..3.3..3......3..3.3..3..33.",
  ".33...33...33........33...33......",
  "..................................",
  "..................................",
  ".33...33...33...33...33...33...33.",
  "3..3.3..3.3..3.3..3.3..3.3..3.3..3",
  "3..3.2..2.2..2.2..2.2..2.2..2.2..2",
  ".33..2..2.2..2.2..2.2..2.2..2.2..2",
  ".....2..2.2..2.1..1.2..2.2..2.2..2",
  ".....2..2.2..2..11..2..2.2..2.2..2",
  ".....2..2.2..2......2..2.2..2.2..2",
  ".....1..1.1..1......1..1.1..1.1..1",
  "......11...11........11...11...11.",
];

export const CELL = 19; // table square size
export const STEP = 22; // grid pitch
export const ORIGIN_X = 12;
export const ORIGIN_Y = 12;

// SVG canvas size implied by the grid (34 cols × 20 rows).
export const VIEWBOX_W = ORIGIN_X * 2 + 34 * STEP; // 772
export const VIEWBOX_H = ORIGIN_Y * 2 + FLOOR_GRID.length * STEP; // 464

function cellRect(r: number, c: number): TableRect {
  return { x: ORIGIN_X + c * STEP, y: ORIGIN_Y + r * STEP, w: CELL, h: CELL };
}

export function generateFloorPlan(): TableUnit[] {
  const units: TableUnit[] = [];
  const R = FLOOR_GRID.length;
  const val = (r: number, c: number): string => {
    if (r < 0 || r >= R) return ".";
    const row = FLOOR_GRID[r];
    return c < 0 || c >= row.length ? "." : row[c] || ".";
  };
  const centroid = (rects: TableRect[]) => ({
    cx: rects.reduce((s, t) => s + t.x + t.w / 2, 0) / rects.length,
    cy: rects.reduce((s, t) => s + t.y + t.h / 2, 0) / rects.length,
  });

  // Standard singles — every blue "2" cell is its own table (£100).
  let sIdx = 1;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < FLOOR_GRID[r].length; c++) {
      if (val(r, c) === "2") {
        const rects = [cellRect(r, c)];
        const { cx, cy } = centroid(rects);
        const label = `S${sIdx++}`;
        units.push({ id: label, label, type: "standard", rects, cx, cy });
      }
    }
  }

  // Grouped units — green ("1") and red ("3") cells pair into L-shaped units.
  const groups: { value: string; type: TableTypeKey; prefix: string }[] = [
    { value: "1", type: "corner", prefix: "E" },
    { value: "3", type: "premier_corner", prefix: "P" },
  ];
  // Partner search: diagonals first (these form the right-angle L), then orthogonals.
  const NEIGHBOURS = [
    [-1, -1], [-1, 1], [1, -1], [1, 1],
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];
  for (const { value, type, prefix } of groups) {
    const used = FLOOR_GRID.map((row) => Array(row.length).fill(false));
    let idx = 1;
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < FLOOR_GRID[r].length; c++) {
        if (val(r, c) !== value || used[r][c]) continue;
        used[r][c] = true;
        // Find one partner to form a 2-table (L-shaped) unit
        let partner: [number, number] | null = null;
        for (const [dy, dx] of NEIGHBOURS) {
          const ny = r + dy;
          const nx = c + dx;
          if (val(ny, nx) === value && used[ny] && !used[ny][nx]) {
            used[ny][nx] = true;
            partner = [ny, nx];
            break;
          }
        }
        const rects: TableRect[] = [cellRect(r, c)];
        if (partner) rects.push(cellRect(partner[0], partner[1]));
        // Place the number on the first table tile so it sits on colour, not in
        // the gap between the two diagonal tiles.
        const cx = rects[0].x + rects[0].w / 2;
        const cy = rects[0].y + rects[0].h / 2;

        const label = `${prefix}${idx++}`;
        units.push({ id: label, label, type, rects, cx, cy });
      }
    }
  }

  return units;
}

export const FLOOR_PLAN: TableUnit[] = generateFloorPlan();

export const EVENT_TABLES: { label: string; type: TableTypeKey }[] = FLOOR_PLAN.map(
  (u) => ({ label: u.label, type: u.type })
);

export const TABLE_TYPE_BY_LABEL: Record<string, TableTypeKey> = Object.fromEntries(
  FLOOR_PLAN.map((u) => [u.label, u.type])
);

export const TABLE_TOTALS: Record<TableTypeKey, number> = FLOOR_PLAN.reduce(
  (acc, u) => {
    acc[u.type] = (acc[u.type] ?? 0) + 1;
    return acc;
  },
  { standard: 0, corner: 0, premier_corner: 0 } as Record<TableTypeKey, number>
);

export const TYPE_LABELS: Record<TableTypeKey, string> = {
  standard: "Standard Table",
  corner: "End Corner",
  premier_corner: "Premier Corner",
};

export const TYPE_PRICE_PENCE: Record<TableTypeKey, number> = {
  standard: 10000,
  corner: 20000,
  premier_corner: 27500,
};
