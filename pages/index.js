import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { PUZZLES } from '../data/puzzles';
import { solveAC3, solveBacktrack } from '../lib/solver';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function deepClone(g) { return g.map(r => [...r]); }

function isComplete(grid, solution) {
  return grid.every((row, r) => row.every((v, c) => v === solution[r][c]));
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function getBestKey(diff, idx) { return `sudoku-best-${diff}-${idx}`; }

export default function Home() {
  const [diff, setDiff] = useState('easy');
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [grid, setGrid] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hints, setHints] = useState(new Set());       // "r,c"
  const [wrong, setWrong] = useState(new Set());        // "r,c"
  const [correct, setCorrect] = useState(new Set());    // "r,c"
  const [mistakes, setMistakes] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState(null);
  const [newBest, setNewBest] = useState(false);
  const [solveInfo, setSolveInfo] = useState(null);
  const [solvedCells, setSolvedCells] = useState(new Set());
  const timerRef = useRef(null);

  // Load puzzle
  const loadPuzzle = useCallback((d, idx) => {
    const p = deepClone(PUZZLES[d][idx]);
    const sol = solveAC3(deepClone(p)) || solveBacktrack(deepClone(p));
    setPuzzle(p);
    setSolution(sol);
    setGrid(deepClone(p));
    setSelected(null);
    setHints(new Set());
    setWrong(new Set());
    setCorrect(new Set());
    setMistakes(0);
    setTime(0);
    setRunning(false);
    setDone(false);
    setNewBest(false);
    setSolveInfo(null);
    setSolvedCells(new Set());
    clearInterval(timerRef.current);
    const b = localStorage.getItem(getBestKey(d, idx));
    setBest(b ? parseInt(b) : null);
  }, []);

  useEffect(() => { loadPuzzle(diff, puzzleIdx); }, []);

  // Timer
  useEffect(() => {
    if (running && !done) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running, done]);

  const handleCellClick = (r, c) => {
    if (done) return;
    setSelected([r, c]);
  };

  const handleKey = useCallback((e) => {
    if (done || !selected) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== 0) return; // given cell

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      if (!running) setRunning(true);
      const key = `${r},${c}`;
      const newGrid = deepClone(grid);
      newGrid[r][c] = num;
      setGrid(newGrid);

      const newWrong = new Set(wrong);
      const newCorrect = new Set(correct);

      if (num === solution[r][c]) {
        newWrong.delete(key);
        newCorrect.add(key);
      } else {
        newCorrect.delete(key);
        newWrong.add(key);
        setMistakes(m => m + 1);
      }
      setWrong(newWrong);
      setCorrect(newCorrect);

      // Check completion
      if (isComplete(newGrid, solution)) {
        setDone(true);
        setRunning(false);
        const stored = localStorage.getItem(getBestKey(diff, puzzleIdx));
        const prev = stored ? parseInt(stored) : null;
        if (!prev || time < prev) {
          localStorage.setItem(getBestKey(diff, puzzleIdx), time);
          setBest(time);
          setNewBest(true);
        }
      }
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const newGrid = deepClone(grid);
      newGrid[r][c] = 0;
      setGrid(newGrid);
      const key = `${r},${c}`;
      const newWrong = new Set(wrong); newWrong.delete(key);
      const newCorrect = new Set(correct); newCorrect.delete(key);
      setWrong(newWrong); setCorrect(newCorrect);
    }
  }, [done, selected, puzzle, grid, solution, running, wrong, correct, diff, puzzleIdx, time]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const handleNumInput = (num) => {
    if (done || !selected) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== 0) return;

    if (num === 0) {
      // Clear cell
      const newGrid = deepClone(grid);
      newGrid[r][c] = 0;
      setGrid(newGrid);
      const key = `${r},${c}`;
      const newWrong = new Set(wrong); newWrong.delete(key);
      const newCorrect = new Set(correct); newCorrect.delete(key);
      setWrong(newWrong); setCorrect(newCorrect);
      return;
    }

    if (!running) setRunning(true);
    const key = `${r},${c}`;
    const newGrid = deepClone(grid);
    newGrid[r][c] = num;
    setGrid(newGrid);

    const newWrong = new Set(wrong);
    const newCorrect = new Set(correct);

    if (num === solution[r][c]) {
      newWrong.delete(key);
      newCorrect.add(key);
    } else {
      newCorrect.delete(key);
      newWrong.add(key);
      setMistakes(m => m + 1);
    }
    setWrong(newWrong);
    setCorrect(newCorrect);

    if (isComplete(newGrid, solution)) {
      setDone(true);
      setRunning(false);
      const stored = localStorage.getItem(getBestKey(diff, puzzleIdx));
      const prev = stored ? parseInt(stored) : null;
      if (!prev || time < prev) {
        localStorage.setItem(getBestKey(diff, puzzleIdx), time);
        setBest(time);
        setNewBest(true);
      }
    }
  };

  const handleHint = () => {
    if (done || !solution) return;
    if (!running) setRunning(true);
    // Find a random empty/wrong cell
    const candidates = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (puzzle[r][c] === 0 && grid[r][c] !== solution[r][c])
          candidates.push([r, c]);
    if (!candidates.length) return;
    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    const key = `${r},${c}`;
    const newGrid = deepClone(grid);
    newGrid[r][c] = solution[r][c];
    setGrid(newGrid);
    setHints(h => new Set([...h, key]));
    const newWrong = new Set(wrong); newWrong.delete(key);
    const newCorrect = new Set(correct); newCorrect.add(key);
    setWrong(newWrong); setCorrect(newCorrect);
  };

  const handleAutoSolve = (algo) => {
    if (!puzzle || !solution) return;
    const start = performance.now();
    const result = algo === 'ac3'
      ? solveAC3(deepClone(puzzle))
      : solveBacktrack(deepClone(puzzle));
    const elapsed = (performance.now() - start).toFixed(2);
    if (!result) return;

    // Animate filled cells
    const filled = new Set();
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (puzzle[r][c] === 0) filled.add(`${r},${c}`);

    setGrid(result);
    setSolvedCells(filled);
    setDone(true);
    setRunning(false);
    setSolveInfo({ algo: algo === 'ac3' ? 'AC-3' : 'Backtracking', ms: elapsed });
    clearInterval(timerRef.current);
  };

  const changeDiff = (d) => {
    setDiff(d); setPuzzleIdx(0); loadPuzzle(d, 0);
  };

  const changePuzzle = (idx) => {
    setPuzzleIdx(idx); loadPuzzle(diff, idx);
  };

  if (!grid || !puzzle) return <div style={{ color: '#fff', padding: 40 }}>Loading…</div>;

  return (
    <>
      <Head><title>Sudoku CSP Solver</title></Head>
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.title}>Sudoku <span style={{ color: '#818cf8' }}>CSP</span></h1>
          <div style={styles.meta}>
            <span style={styles.chip}>⏱ {formatTime(time)}</span>
            {best && <span style={styles.chip}>🏆 {formatTime(best)}</span>}
            <span style={{ ...styles.chip, background: '#ef4444' }}>❌ {mistakes}</span>
          </div>
        </header>

        {/* Difficulty selector */}
        <div style={styles.row}>
          {DIFFICULTIES.map(d => (
            <button key={d} onClick={() => changeDiff(d)}
              style={{ ...styles.btn, ...(diff === d ? styles.btnActive : {}) }}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Puzzle selector */}
        <div style={styles.row}>
          {PUZZLES[diff].map((_, i) => (
            <button key={i} onClick={() => changePuzzle(i)}
              style={{ ...styles.btn, ...(puzzleIdx === i ? styles.btnActive : {}) }}>
              #{i + 1}
            </button>
          ))}
        </div>

        {/* Board */}
        <div style={styles.board} tabIndex={0}>
          {grid.map((row, r) => row.map((val, c) => {
            const key = `${r},${c}`;
            const isGiven = puzzle[r][c] !== 0;
            const isSel = selected && selected[0] === r && selected[1] === c;
            const isHint = hints.has(key);
            const isWrong = wrong.has(key);
            const isCorrect = correct.has(key);
            const isSolvedCell = solvedCells.has(key);
            const sameNum = selected && val !== 0 && grid[selected[0]][selected[1]] === val;
            const sameRC = selected &&
              (selected[0] === r || selected[1] === c ||
                (Math.floor(selected[0]/3) === Math.floor(r/3) && Math.floor(selected[1]/3) === Math.floor(c/3)));

            let bg = 'transparent';
            if (sameRC && !isSel) bg = '#1e293b';
            if (sameNum && !isSel) bg = '#312e81';
            if (isSel) bg = '#4338ca';

            let color = isGiven ? '#f1f5f9' : '#818cf8';
            if (isWrong) color = '#ef4444';
            if (isHint) color = '#f59e0b';
            if (isSolvedCell) color = '#34d399';

            const borderRight = (c + 1) % 3 === 0 && c !== 8 ? '2px solid #475569' : '1px solid #1e293b';
            const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? '2px solid #475569' : '1px solid #1e293b';

            return (
              <div key={key} onClick={() => handleCellClick(r, c)}
                style={{
                  ...styles.cell,
                  background: bg,
                  color,
                  fontWeight: isGiven ? 700 : 400,
                  borderRight,
                  borderBottom,
                  fontSize: isGiven ? 18 : 16,
                }}>
                {val !== 0 ? val : ''}
              </div>
            );
          }))}
        </div>

        {/* Number Pad for mobile */}
        <div style={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
            <button 
              key={n} 
              style={styles.numBtn} 
              onClick={() => handleNumInput(n)}
            >
              {n === 0 ? '✕' : n}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div style={styles.row}>
          <button style={styles.btn} onClick={handleHint}>💡 Hint</button>
          <button style={styles.btn} onClick={() => handleAutoSolve('ac3')}>▶ AC-3</button>
          <button style={styles.btn} onClick={() => handleAutoSolve('backtrack')}>▶ Backtrack</button>
          <button style={{ ...styles.btn, background: '#334155' }}
            onClick={() => loadPuzzle(diff, puzzleIdx)}>↺ Reset</button>
        </div>

        {solveInfo && (
          <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 13 }}>
            Solved with {solveInfo.algo} in {solveInfo.ms}ms
          </p>
        )}

        {/* Completion modal */}
        {done && !solveInfo && (
          <div style={styles.modal}>
            <div style={styles.modalBox}>
              <div style={{ fontSize: 48 }}>{newBest ? '🌟' : '🎉'}</div>
              <h2 style={{ margin: '8px 0', color: '#f1f5f9' }}>
                {newBest ? 'New Best!' : 'Puzzle Complete!'}
              </h2>
              <p style={{ color: '#94a3b8' }}>Time: <b style={{ color: '#f1f5f9' }}>{formatTime(time)}</b></p>
              {best && <p style={{ color: '#94a3b8' }}>Best: <b style={{ color: '#f1f5f9' }}>{formatTime(best)}</b></p>}
              <p style={{ color: '#94a3b8' }}>Mistakes: <b style={{ color: '#ef4444' }}>{mistakes}</b></p>
              <button style={{ ...styles.btn, ...styles.btnActive, marginTop: 16 }}
                onClick={() => loadPuzzle(diff, puzzleIdx)}>Play Again</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 8px 48px',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: 0 },
  meta: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    background: '#1e293b', color: '#cbd5e1', borderRadius: 8,
    padding: '4px 8px', fontSize: 12, fontWeight: 600,
  },
  row: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', justifyContent: 'center' },
  btn: {
    background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12,
    fontWeight: 600, transition: 'all .15s',
  },
  btnActive: { background: '#4338ca', color: '#fff', borderColor: '#4338ca' },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    gridTemplateRows: 'repeat(9, 1fr)',
    border: '2px solid #475569',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
    outline: 'none',
    width: 'min(90vw, 400px)',
    height: 'min(90vw, 400px)',
    maxWidth: '400px',
    maxHeight: '400px',
  },
  cell: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 'clamp(14px, 4vw, 18px)', transition: 'background .1s',
    borderTop: 'none', borderLeft: 'none',
    aspectRatio: '1',
  },
  numpad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 6,
    width: 'min(90vw, 300px)',
    marginBottom: 12,
  },
  numBtn: {
    background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
    borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontSize: 18,
    fontWeight: 600, transition: 'all .15s',
  },
  modal: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
    padding: 16,
  },
  modalBox: {
    background: '#1e293b', borderRadius: 16, padding: '24px 32px',
    textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,.5)',
    maxWidth: '90vw',
  },
};
