// ─── helpers ────────────────────────────────────────────────────────────────

function clone(grid) {
  return grid.map(r => [...r]);
}

function peers(r, c) {
  const result = new Set();
  for (let i = 0; i < 9; i++) {
    if (i !== c) result.add(`${r},${i}`);
    if (i !== r) result.add(`${i},${c}`);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++) {
      const nr = br + dr, nc = bc + dc;
      if (nr !== r || nc !== c) result.add(`${nr},${nc}`);
    }
  return [...result].map(s => s.split(',').map(Number));
}

// ─── AC-3 ────────────────────────────────────────────────────────────────────

function initDomains(grid) {
  const domains = Array.from({ length: 9 }, () => Array(9).fill(null));
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      domains[r][c] = grid[r][c] !== 0
        ? new Set([grid[r][c]])
        : new Set([1,2,3,4,5,6,7,8,9]);
  return domains;
}

function ac3(domains) {
  const queue = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      for (const [pr, pc] of peers(r, c))
        queue.push([r, c, pr, pc]);

  while (queue.length) {
    const [r, c, pr, pc] = queue.shift();
    if (revise(domains, r, c, pr, pc)) {
      if (domains[r][c].size === 0) return false;
      for (const [nr, nc] of peers(r, c))
        if (nr !== pr || nc !== pc)
          queue.push([nr, nc, r, c]);
    }
  }
  return true;
}

function revise(domains, r, c, pr, pc) {
  let revised = false;
  for (const val of [...domains[r][c]]) {
    const peerHasOther = [...domains[pr][pc]].some(v => v !== val);
    if (!peerHasOther) {
      domains[r][c].delete(val);
      revised = true;
    }
  }
  return revised;
}

function domainsToGrid(domains) {
  return domains.map(row => row.map(d => d.size === 1 ? [...d][0] : 0));
}

function isSolved(grid) {
  return grid.every(row => row.every(v => v !== 0));
}

export function solveAC3(inputGrid) {
  const domains = initDomains(inputGrid);
  if (!ac3(domains)) return null;
  const grid = domainsToGrid(domains);
  if (isSolved(grid)) return grid;
  // Fall back to MAC (AC3 + backtracking)
  return macBacktrack(domains);
}

// ─── Backtracking ────────────────────────────────────────────────────────────

function findEmpty(grid) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] === 0) return [r, c];
  return null;
}

function isValid(grid, r, c, val) {
  for (const [pr, pc] of peers(r, c))
    if (grid[pr][pc] === val) return false;
  return true;
}

export function solveBacktrack(inputGrid) {
  const grid = clone(inputGrid);
  function bt() {
    const cell = findEmpty(grid);
    if (!cell) return true;
    const [r, c] = cell;
    for (let v = 1; v <= 9; v++) {
      if (isValid(grid, r, c, v)) {
        grid[r][c] = v;
        if (bt()) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }
  return bt() ? grid : null;
}

// ─── MAC (backtracking + AC3) ────────────────────────────────────────────────

function macBacktrack(domains) {
  // pick unassigned cell with smallest domain (MRV heuristic)
  let minSize = Infinity, bestR = -1, bestC = -1;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (domains[r][c].size > 1 && domains[r][c].size < minSize) {
        minSize = domains[r][c].size; bestR = r; bestC = c;
      }
  if (bestR === -1) return domainsToGrid(domains); // solved

  for (const val of [...domains[bestR][bestC]]) {
    const saved = domains.map(row => row.map(d => new Set(d)));
    domains[bestR][bestC] = new Set([val]);
    if (ac3(domains)) {
      const result = macBacktrack(domains);
      if (result) return result;
    }
    // restore
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        domains[r][c] = saved[r][c];
  }
  return null;
}
