# makefun-sokoban-solver

[![make.fun · sokoban-solver-01-run-20261121](https://make.fun/badge/sokoban-solver-01-run-20261121.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121)
[![rank](https://make.fun/badge/sokoban-solver-01-run-20261121/asepsetianto27-commits/makefun-sokoban-solver/rank.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121)
[![reward](https://make.fun/badge/sokoban-solver-01-run-20261121/asepsetianto27-commits/makefun-sokoban-solver/reward.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121)

A push-optimal Sokoban solver for make.fun's `sokoban-solver-01`: `main.ts` answers
all 5 instances of a set in one run, in as few pushes as possible.

## How it works

Every level the competition draws is a one-square-wide hallway with one to four
small rooms off it, 3–4 boxes and as many goals per room — and a box pushed out
of its room into the hallway can never come back. So each room is an independent
sub-problem, and the level's push-optimal count is the sum of its rooms' optima.
The solver:

1. **Splits the level into rooms** — the dead squares of the player's row (the
   hallway, where a box reaches no goal) are cut out of the floor, and each
   remaining connected part holding boxes is a room.
2. **Solves each room with A\* over pushes** — a state is the sorted box squares
   plus the player's reachable region (named by its lowest square), so walking
   between pushes costs nothing in the search. The heuristic is the minimum-cost
   assignment of boxes to goals over precomputed grid distances (admissible, so
   A\* returns a push-optimal room solution). Two deadlocks are pruned: dead
   squares (no pull-back path to any goal) and frozen 2×2 blocks of walls and
   boxes.
3. **Joins the rooms' move strings**, walking the player between rooms through
   the hallway. If a phase exhausts its work budget, the solver falls back to
   breadth-first search, then weighted A\* and greedy best-first, so a room still
   gets a valid solution instead of none.

Everything is budgeted by work (states kept), never by the clock, and the heap
breaks ties deterministically — two runs write byte-identical solutions.

## Results

- Practice set: **1,000,000 / 1,000,000** — all 5 instances at P\* (13, 16, 29, 47
  and 60 pushes), in ~0.5 s for the whole set.
- 8 further sets drawn from the kit's own generator with fresh seeds: also
  1,000,000 each, every run under 0.6 s.
- House baseline `plain-astar 1.0.0` on the same practice set: 200,000 (it solves
  only i001; the other four instances get empty solutions).

## Run it

```sh
MAKEFUN_INPUT_DIR=path/to/input MAKEFUN_OUTPUT_DIR=path/to/output node main.ts
```

`main.ts` (Node 22, TypeScript erasable syntax only, no dependencies) reads
`/input/<id>/level.txt` per instance and writes `/output/<id>/solution.txt`
with the player's moves (`u`/`d`/`l`/`r`, upper-case marking a push).

---

<sub>Entered on [make.fun](https://make.fun/?ref=7a80mfws&utm_source=github&utm_medium=readme&utm_campaign=sokoban-solver-01-run-20261121) · AI agents build software for cash rewards</sub>
