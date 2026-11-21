// Sokoban solver for make.fun's sokoban-solver-01 (written from scratch for this entry).
//
// Strategy: the generator builds every level as a one-square-wide hallway with one to four
// small rooms off it (3-4 boxes and as many goals per room), and a box pushed out of its room
// into the hallway can never come back. So each room is an independent sub-problem and the
// level's push-optimal count is the sum of the rooms' optima. This program
//   1. splits a level into its rooms (dead squares of the player's row cut the hallway out),
//   2. solves each room push-optimally with A* over pushes (state = sorted box squares plus
//      the player's reachable region, named by its lowest square),
//   3. joins the rooms' move strings, walking the player between rooms through the hallway.
//
// The push search uses an admissible heuristic (minimum-cost assignment of boxes to goals
// over precomputed grid distances) and prunes two deadlocks a box can never leave: a dead
// square (no pull-back path to any goal) and a frozen 2x2 block of walls and boxes. A*
// with an admissible heuristic returns a push-optimal room solution. If a phase exhausts
// its work budget the solver falls back to breadth-first search (same pruning, same state
// abstraction), then to weighted A* and greedy best-first, so a room still gets a valid,
// if not optimal, solution instead of nothing.
//
// Determinism: every budget is a count of work (states kept), never the clock; the heap
// breaks ties by (f, h, insertion order); neighbour order is fixed (u, d, l, r) everywhere.
// Two runs therefore write byte-identical solutions.
import { chmodSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The four moves in fixed order: [dx, dy, step letter, push letter].
const DIRS: Array<[number, number, string, string]> = [
  [0, -1, 'u', 'U'],
  [0, 1, 'd', 'D'],
  [-1, 0, 'l', 'L'],
  [1, 0, 'r', 'R'],
];

interface Level {
  w: number;
  h: number;
  size: number;
  wall: Uint8Array;
  goals: number[];
  boxes: number[];
  player: number;
}

/** Parse XSB text: # wall, space floor, . goal, $ box, * box on goal, @ player, + player on goal. */
function parseLevel(text: string): Level {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const size = w * h;
  const wall = new Uint8Array(size).fill(1);
  const goals: number[] = [];
  const boxes: number[] = [];
  let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const i = y * w + x;
      if (ch === '#') continue;
      wall[i] = 0;
      if (ch === '.' || ch === '*' || ch === '+') goals.push(i);
      if (ch === '$' || ch === '*') boxes.push(i);
      if (ch === '@' || ch === '+') player = i;
    }
  });
  // The outermost frame is wall whatever it shows: nothing leaves the board.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) wall[y * w + x] = 1;
    }
  }
  boxes.sort((a, b) => a - b);
  goals.sort((a, b) => a - b);
  return { w, h, size, wall, goals, boxes, player };
}

/** Squares from which a box can be pulled back onto some goal (pull-back from the goals). */
function liveSquares(level: Level): Uint8Array {
  const { w, wall, goals, size } = level;
  const live = new Uint8Array(size);
  const queue: number[] = [];
  for (const g of goals) {
    live[g] = 1;
    queue.push(g);
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const x = queue[qi]!;
    for (const [dx, dy] of DIRS) {
      const d = dy * w + dx;
      const y = x - d;
      if (y < 0 || y >= size) continue;
      if (!wall[y] && !wall[y - d] && !live[y]) {
        live[y] = 1;
        queue.push(y);
      }
    }
  }
  return live;
}

/** Flood-fill the player's reachable region from `from` (boxes in `occupied` block). Returns the region's lowest square. */
function reach(
  level: Level,
  occupied: Uint8Array,
  from: number,
  seen: Int32Array,
  stamp: number,
  stack: Int32Array,
): number {
  const { w, wall } = level;
  let low = from;
  let n = 0;
  stack[n++] = from;
  seen[from] = stamp;
  while (n > 0) {
    const p = stack[--n]!;
    if (p < low) low = p;
    for (let k = 0; k < 4; k++) {
      const q = k === 0 ? p - w : k === 1 ? p + w : k === 2 ? p - 1 : p + 1;
      if (wall[q] === 0 && occupied[q] === 0 && seen[q] !== stamp) {
        seen[q] = stamp;
        stack[n++] = q;
      }
    }
  }
  return low;
}

/** Whether the box just pushed to `t` sits in a frozen 2x2 block of walls and boxes with a box off its goal. */
function frozenBlock(level: Level, occupied: Uint8Array, goal: Uint8Array, t: number): boolean {
  const { w, wall } = level;
  for (const a of [t, t - 1, t - w, t - w - 1]) {
    const b = a + 1;
    const c = a + w;
    const d = c + 1;
    if (!(wall[a] || occupied[a]) || !(wall[b] || occupied[b]) || !(wall[c] || occupied[c]) || !(wall[d] || occupied[d])) continue;
    if ((occupied[a] && !goal[a]) || (occupied[b] && !goal[b]) || (occupied[c] && !goal[c]) || (occupied[d] && !goal[d])) return true;
  }
  return false;
}

/** Shortest walk from `from` to `to` around walls and boxes, in lower-case letters (first direction first on ties). */
function walkTo(level: Level, occupied: Uint8Array, from: number, to: number): string {
  const { w, wall, size } = level;
  if (from === to) return '';
  const prev = new Int32Array(size).fill(-1);
  const how = new Array<string>(size);
  const queue = [from];
  prev[from] = from;
  for (let qi = 0; qi < queue.length; qi++) {
    const p = queue[qi]!;
    if (p === to) break;
    for (const [dx, dy, letter] of DIRS) {
      const q = p + dy * w + dx;
      if (wall[q] || occupied[q] || prev[q] !== -1) continue;
      prev[q] = p;
      how[q] = letter;
      queue.push(q);
    }
  }
  if (prev[to] === -1) throw new Error('walkTo: push square out of reach');
  let s = '';
  for (let p = to; p !== from; p = prev[p]!) s = how[p]! + s;
  return s;
}

/** All permutations of [0..n-1] as index lists (n <= 5 in practice; used by the assignment heuristic). */
function permutations(n: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const rec = (): void => {
    if (cur.length === n) {
      out.push(cur.slice());
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      rec();
      cur.pop();
      used[i] = false;
    }
  };
  rec();
  return out;
}

interface SearchResult {
  pushes: number;
  moves: string;
}

/**
 * Push search over one level (a room sub-level or, as a fallback, a whole level).
 * weight 1 = A* with an admissible heuristic (push-optimal); weight 0 = breadth-first
 * (f = g, FIFO tie-break); weight > 1 = weighted A*; Infinity = greedy best-first.
 * Returns null when the state budget runs out (work, never the clock).
 */
function searchPush(level: Level, maxStates: number, weight: number): SearchResult | null {
  const { w, wall, goals, size } = level;
  const n = level.boxes.length;
  const goal = new Uint8Array(size);
  for (const g of goals) goal[g] = 1;
  const live = liveSquares(level);
  if (level.boxes.some((b) => !live[b])) return null;
  const solved = (boxes: number[]): boolean => boxes.every((b) => goal[b]);
  if (solved(level.boxes)) return { pushes: 0, moves: '' };

  // Grid distances from each goal over open floor (boxes ignored): a lower bound on pushes.
  const distFromGoal: Int32Array[] = [];
  for (const g of goals) {
    const dist = new Int32Array(size).fill(-1);
    const queue = [g];
    dist[g] = 0;
    for (let qi = 0; qi < queue.length; qi++) {
      const p = queue[qi]!;
      for (const [dx, dy] of DIRS) {
        const q = p + dy * w + dx;
        if (!wall[q] && dist[q] === -1) {
          dist[q] = dist[p]! + 1;
          queue.push(q);
        }
      }
    }
    distFromGoal.push(dist);
  }
  // Heuristic: cheapest assignment of boxes to goals (exact for n <= 5, sum-of-minima above).
  const perms = n <= 5 ? permutations(n) : null;
  const heuristic = (boxes: number[]): number => {
    if (perms !== null) {
      let best = Infinity;
      for (const perm of perms) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          const d = distFromGoal[perm[i]!]![boxes[i]!]!;
          if (d < 0) {
            sum = Infinity;
            break;
          }
          sum += d;
        }
        if (sum < best) best = sum;
      }
      return best;
    }
    let sum = 0;
    for (const b of boxes) {
      let m = Infinity;
      for (const dist of distFromGoal) {
        const d = dist[b]!;
        if (d >= 0 && d < m) m = d;
      }
      if (m === Infinity) return Infinity;
      sum += m;
    }
    return sum;
  };

  const occupied = new Uint8Array(size);
  const seen = new Int32Array(size);
  const mark = new Int32Array(size);
  const stack = new Int32Array(size);
  let stamp = 0;

  // Numeric state key while it stays exact (< 2^53); a string key for many boxes.
  const numericKey = size ** (n + 1) < 2 ** 53;
  const keyOf = (boxes: number[], low: number): number | string => {
    if (numericKey) {
      let k = low;
      for (const b of boxes) k = k * size + b;
      return k;
    }
    return `${low}:${boxes.join(',')}`;
  };

  const sBoxes: number[][] = [level.boxes.slice()];
  const sPlayer: number[] = [level.player];
  const sParent: number[] = [-1];
  const sPushDir: number[] = [-1];
  const sG: number[] = [0];
  const sKey: Array<number | string> = [];
  const best = new Map<number | string, number>();
  for (const b of level.boxes) occupied[b] = 1;
  const startLow = reach(level, occupied, level.player, seen, ++stamp, stack);
  for (const b of level.boxes) occupied[b] = 0;
  const startKey = keyOf(level.boxes, startLow);
  sKey.push(startKey);
  best.set(startKey, 0);

  // Binary heap ordered by (f, h, insertion order): fully deterministic.
  type HeapEntry = [number, number, number, number]; // f, h, seq, state index
  const heap: HeapEntry[] = [];
  const less = (a: HeapEntry, b: HeapEntry): boolean =>
    a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  const heapPush = (e: HeapEntry): void => {
    let i = heap.length;
    heap.push(e);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(heap[i]!, heap[p]!)) break;
      const tmp = heap[i]!;
      heap[i] = heap[p]!;
      heap[p] = tmp;
      i = p;
    }
  };
  const heapPop = (): HeapEntry => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      for (let i = 0; ; ) {
        let c = 2 * i + 1;
        if (c >= heap.length) break;
        if (c + 1 < heap.length && less(heap[c + 1]!, heap[c]!)) c++;
        if (!less(heap[c]!, heap[i]!)) break;
        const tmp = heap[i]!;
        heap[i] = heap[c]!;
        heap[c] = tmp;
        i = c;
      }
    }
    return top;
  };

  let seq = 0;
  const h0 = heuristic(level.boxes);
  if (h0 === Infinity) return null;
  const fOf = (g: number, h: number): number =>
    weight === 0 ? g : weight === Infinity ? h : g + weight * h;
  heapPush([fOf(0, h0), h0, seq++, 0]);

  let found = -1;
  let expanded = 0;
  while (heap.length > 0) {
    const [, , , s] = heapPop();
    const boxes = sBoxes[s]!;
    const g = sG[s]!;
    if (best.get(sKey[s]!) !== g) continue; // stale heap entry
    if (solved(boxes)) {
      found = s;
      break;
    }
    if (expanded >= maxStates) return null;
    expanded++;
    for (const b of boxes) occupied[b] = 1;
    reach(level, occupied, sPlayer[s]!, seen, ++stamp, stack);
    const here = stamp;
    for (let bi = 0; bi < boxes.length; bi++) {
      const b = boxes[bi]!;
      for (let di = 0; di < 4; di++) {
        const [dx, dy] = DIRS[di]!;
        const d = dy * w + dx;
        const t = b + d;
        if (seen[b - d] !== here || wall[t] || occupied[t] || !live[t]) continue;
        occupied[b] = 0;
        occupied[t] = 1;
        if (frozenBlock(level, occupied, goal, t)) {
          occupied[t] = 0;
          occupied[b] = 1;
          continue;
        }
        const next = boxes.slice();
        next[bi] = t;
        next.sort((a, x) => a - x);
        const low = reach(level, occupied, b, mark, ++stamp, stack);
        const k = keyOf(next, low);
        const g2 = g + 1;
        const prevBest = best.get(k);
        if (prevBest === undefined || g2 < prevBest) {
          const h = heuristic(next);
          if (h === Infinity) {
            occupied[t] = 0;
            occupied[b] = 1;
            continue;
          }
          if (sBoxes.length >= maxStates) {
            for (const x of boxes) occupied[x] = 0;
            return null;
          }
          best.set(k, g2);
          const idx = sBoxes.length;
          sBoxes.push(next);
          sPlayer.push(b);
          sParent.push(s);
          sPushDir.push(di);
          sG.push(g2);
          sKey.push(k);
          heapPush([fOf(g2, h), h, seq++, idx]);
        }
        occupied[t] = 0;
        occupied[b] = 1;
      }
    }
    for (const x of boxes) occupied[x] = 0;
  }
  if (found < 0) return null;

  // Reconstruct: walk the parent chain, then turn each push into walk + push letters.
  const path: number[] = [];
  for (let s = found; s > 0; s = sParent[s]!) path.push(s);
  path.reverse();
  let moves = '';
  let player = level.player;
  let boxes = level.boxes.slice();
  for (const s of path) {
    const nextBoxes = sBoxes[s]!;
    const from = boxes.find((b) => !nextBoxes.includes(b))!;
    const to = nextBoxes.find((b) => !boxes.includes(b))!;
    const di = sPushDir[s]!;
    const [dx, dy, , pushLetter] = DIRS[di]!;
    const d = dy * w + dx;
    for (const b of boxes) occupied[b] = 1;
    moves += walkTo(level, occupied, player, from - d);
    for (const b of boxes) occupied[b] = 0;
    moves += pushLetter;
    player = from;
    boxes = nextBoxes;
  }
  return { pushes: path.length, moves };
}

interface Room {
  boxes: number[];
  goals: number[];
}

/**
 * Split a level into rooms: cut the dead squares of the player's row (the hallway: a box
 * there reaches no goal) out of the floor; each remaining part holding a box is a room.
 * Null when the level is no set of rooms (a box in the hallway, a goal outside a room,
 * or a room whose boxes and goals do not match).
 */
function roomsOf(level: Level): Room[] | null {
  const { w, wall, goals, boxes, player, size } = level;
  const live = liveSquares(level);
  const row = Math.floor(player / w);
  const cut = new Uint8Array(size);
  for (let i = row * w; i < (row + 1) * w; i++) if (!wall[i] && !live[i]) cut[i] = 1;
  if (boxes.some((b) => cut[b])) return null;
  const part = new Int32Array(size).fill(-1);
  const rooms: Room[] = [];
  for (let s = 0; s < size; s++) {
    if (wall[s] || cut[s] || part[s] >= 0) continue;
    const squares = [s];
    part[s] = rooms.length;
    for (let i = 0; i < squares.length; i++) {
      for (const [dx, dy] of DIRS) {
        const q = squares[i]! + dy * w + dx;
        if (!wall[q] && !cut[q] && part[q] < 0) {
          part[q] = rooms.length;
          squares.push(q);
        }
      }
    }
    rooms.push({ boxes: [], goals: [] });
  }
  for (const b of boxes) rooms[part[b]!]!.boxes.push(b);
  for (const g of goals) {
    if (part[g]! < 0) return null;
    rooms[part[g]!]!.goals.push(g);
  }
  if (rooms.some((r) => r.boxes.length !== r.goals.length)) return null;
  return rooms.filter((r) => r.boxes.length > 0);
}

/** Solve a level room by room; fall back to a whole-level search when it is no set of rooms. */
function solveLevel(text: string): string {
  const level = parseLevel(text);
  const goalSet = new Set(level.goals);
  if (level.boxes.every((b) => goalSet.has(b))) return '';
  const rooms = roomsOf(level);
  if (rooms !== null) {
    // Current box squares per room: solved rooms rest on their goals.
    const currentBoxes = rooms.map((r) => r.boxes.slice());
    let player = level.player;
    let moves = '';
    let ok = true;
    for (let ri = 0; ri < rooms.length; ri++) {
      const room = rooms[ri]!;
      const wall = level.wall.slice();
      for (let oj = 0; oj < rooms.length; oj++) {
        if (oj === ri) continue;
        for (const b of currentBoxes[oj]!) wall[b] = 1;
      }
      const sub: Level = {
        w: level.w,
        h: level.h,
        size: level.size,
        wall,
        goals: room.goals.slice().sort((a, b) => a - b),
        boxes: room.boxes.slice().sort((a, b) => a - b),
        player,
      };
      // A* (optimal), then BFS (optimal), then weighted A* and greedy (valid, maybe not optimal).
      const solved =
        searchPush(sub, 250_000, 1) ??
        searchPush(sub, 250_000, 0) ??
        searchPush(sub, 150_000, 4) ??
        searchPush(sub, 150_000, Infinity);
      if (solved === null) {
        ok = false;
        break;
      }
      moves += solved.moves;
      // The player's square after the room's moves.
      for (const ch of solved.moves.toLowerCase()) {
        player += ch === 'u' ? -level.w : ch === 'd' ? level.w : ch === 'l' ? -1 : 1;
      }
      currentBoxes[ri] = room.goals.slice();
    }
    if (ok) return moves;
  }
  // Whole-level fallback (rare: the level was no set of rooms, or a room resisted every phase).
  const whole =
    searchPush(level, 250_000, 1) ??
    searchPush(level, 250_000, 0) ??
    searchPush(level, 150_000, 4) ??
    searchPush(level, 150_000, Infinity);
  return whole === null ? '' : whole.moves;
}

for (const id of readdirSync(I).sort()) {
  const moves = solveLevel(readFileSync(join(I, id, 'level.txt'), 'utf8'));
  const dir = join(O, id);
  mkdirSync(dir, { recursive: true });
  chmodSync(dir, 0o755);
  const file = join(dir, 'solution.txt');
  writeFileSync(file, `${moves}\n`);
  chmodSync(file, 0o644);
}
