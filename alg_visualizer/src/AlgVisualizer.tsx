import { useState } from "react";

const CELL_CLASSES = [
  "obstacle",
  "free",
  "source",
  "target",
  "path",
  "visited",
  "current",
];

enum Action {
  CHOOSE_SOURCE,
  CHOOSE_TARGET,
  CHOOSE_OBSTACLES,
  SIMULATING,
}

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function AlgVisualizer() {
  const cellSize = 20;
  const gridWidth = 40;
  const gridHeight = 30;
  const [action, setAction] = useState(Action.CHOOSE_SOURCE);
  const [hasSource, setHasSource] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [obstacleIds, setObstacleIds] = useState<string[]>([]);

  function setCellClass(id: string, className: string) {
    const element = document.getElementById(id);
    if (element) {
      element.classList.remove(...CELL_CLASSES);
      element.classList.add(className);
    }
  }

  function onCellClick(id: string) {
    if (action === Action.SIMULATING) {
      return;
    }
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    switch (action) {
      case Action.CHOOSE_SOURCE:
        if (element.classList.contains("obstacle")) {
          setObstacleIds(obstacleIds.filter((obstacleId: string) => obstacleId !== id));
        }
        if (element.classList.contains("target")) {
          break;
        }

        if (!hasSource) {
          setHasSource(true);
          setSelectedSourceId(id);
          setCellClass(id, "source");
        } else {
          if (selectedSourceId === id) {
            setSelectedSourceId("");
            setHasSource(false);
            setCellClass(id, "free");
          } else {
            const prevSource = document.getElementById(selectedSourceId);
            if (prevSource) {
              setCellClass(selectedSourceId, "free");
            }
            setSelectedSourceId(id);
            setCellClass(id, "source");
          }
        }
        break;
      case Action.CHOOSE_TARGET:
        if (element.classList.contains("obstacle")) {
          setObstacleIds(obstacleIds.filter((obstacleId: string) => obstacleId !== id));
        }
        if (element.classList.contains("source")) {
          break;
        }

        if (!hasTarget) {
          setCellClass(id, "target");
          setHasTarget(true);
          setSelectedTargetId(id);
        } else {
          if (selectedTargetId === id) {
            setSelectedTargetId("");
            setHasTarget(false);
            setCellClass(id, "free");
          } else {
            const prevTarget = document.getElementById(selectedTargetId);
            if (prevTarget) {
              setCellClass(selectedTargetId, "free");
            }
            setSelectedTargetId(id);
            setCellClass(id, "target");
          }
        }
        break;
      case Action.CHOOSE_OBSTACLES:
        {
          if (
            element.classList.contains("source") ||
            element.classList.contains("target")
          ) {
            break;
          }
          if (element.classList.contains("obstacle")) {
            setCellClass(id, "free");
            if (obstacleIds.includes(id)) {
              setObstacleIds(
                obstacleIds.filter((obstacleId: string) => obstacleId !== id)
              );
            }
          } else {
            setCellClass(id, "obstacle");
            if (!obstacleIds.includes(id)) {
              setObstacleIds([...obstacleIds, id]);
            }
          }
        }
        break;
    }
  }

  function genRandomObstacles() {
    // first remove all current obstacles
    document.querySelectorAll(".obstacle").forEach((el) => {
      el.classList.remove("obstacle");
      el.classList.add("free");
    });
    const min = Math.floor(0.4 * gridWidth * gridHeight);
    const max = Math.floor(0.5 * gridWidth * gridHeight);
    const numObstacles = Math.floor(Math.random() * (max - min) + min);

    const newObstacles = [];
    for (let i = 0; i < numObstacles; i++) {
      const id = Math.floor(Math.random() * (gridWidth * gridHeight));
      if (hasSource && id === parseInt(selectedSourceId)) {
        continue;
      }
      if (hasTarget && id === parseInt(selectedTargetId)) {
        continue;
      }
      const element = document.getElementById(id.toString());
      if (element) {
        setCellClass(id.toString(), "obstacle");
      }
      newObstacles.push(id.toString());
    }
    setObstacleIds(newObstacles);
  }
  function clearPrevSimulation() {
    document.querySelectorAll(".visited").forEach((el) => {
      el.classList.remove("visited");
    });
    document.querySelectorAll(".path").forEach((el) => {
      el.classList.remove("path");
    });
  }

  async function startSimulation() {
    if (action === Action.SIMULATING) {
      setAction(Action.CHOOSE_SOURCE);
    } else {
      setAction(Action.SIMULATING);
      clearPrevSimulation();
      await aStar();
      setAction(Action.CHOOSE_SOURCE);
    }
  }

  function geth2Text() {
    switch (action) {
      case Action.CHOOSE_SOURCE:
        return "Select a source";
      case Action.CHOOSE_TARGET:
        return "Select a target";
      case Action.CHOOSE_OBSTACLES:
        return "Select obstacles";
      case Action.SIMULATING:
        return "Simulating";
    }
  }

  function manhattan(id1: number, id2: number) {
    const r1 = Math.floor(id1 / gridWidth);
    const c1 = id1 % gridWidth;
    const r2 = Math.floor(id2 / gridWidth);
    const c2 = id2 % gridWidth;
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  function getMinF(q: string[], fVals: Map<string, number>) {
    let min = Number.MAX_VALUE;
    let minId = "";
    for (const k of q) {
      const v = fVals.get(k);
      if (v !== undefined && v < min) {
        min = v;
        minId = k;
      }
    }
    return minId;
  }

  function colorBestPath(cameFrom: Map<string, string>, curr: string) {
    while (cameFrom.has(curr)) {
      const el = document.getElementById(curr);
      if (
        el &&
        !el.classList.contains("source") &&
        !el.classList.contains("target")
      ) {
        setCellClass(curr, "path");
      }
      curr = cameFrom.get(curr)!;
    }
  }

  async function aStar() {
    const cameFrom = new Map();
    const fVals = new Map();
    const gVals = new Map();
    fVals.set(selectedSourceId, 0);
    gVals.set(
      selectedSourceId,
      manhattan(parseInt(selectedSourceId), parseInt(selectedTargetId))
    );

    let q = [selectedSourceId];
    while (q.length > 0) {
      const curr = getMinF(q, fVals);
      q = q.filter((k) => k !== curr);
      if (curr === selectedTargetId) {
        colorBestPath(cameFrom, curr);
        return;
      }

      if (curr !== selectedSourceId) {
        const element = document.getElementById(curr);
        if (element) {
          setCellClass(curr, "current");
        }
      }
      await sleep(50);

      for (const dir of DIRS) {
        const r = Math.floor(parseInt(curr) / gridWidth) + dir[0];
        const c = (parseInt(curr) % gridWidth) + dir[1];
        if (r < 0 || r >= gridHeight || c < 0 || c >= gridWidth) {
          continue;
        }
        const id = r * gridWidth + c;
        if (id >= 0 && id < gridWidth * gridHeight) {
          if (obstacleIds.includes(id.toString())) {
            continue;
          }
          const g = gVals.get(curr) + 1;
          if (!gVals.has(id.toString()) || g < gVals.get(id.toString())) {
            cameFrom.set(id.toString(), curr);
            gVals.set(id.toString(), g);
            const h = manhattan(id, parseInt(selectedTargetId));
            const f = g + h;
            fVals.set(id.toString(), f);
            if (!q.includes(id.toString())) {
              q.push(id.toString());
            }
          }
        }
      }

      if (curr !== selectedSourceId) {
        const element = document.getElementById(curr);
        if (element) {
          setCellClass(curr, "visited");
        }
      }
    }
  }

  return (
    <>
      <div className="flex flex-row">
        <button
          onClick={() =>
            action !== Action.SIMULATING && setAction(Action.CHOOSE_SOURCE)
          }
          disabled={action === Action.SIMULATING}
        >
          Choose Source
        </button>
        <button
          onClick={() =>
            action !== Action.SIMULATING && setAction(Action.CHOOSE_TARGET)
          }
          disabled={action === Action.SIMULATING}
        >
          Choose Target
        </button>
        <button
          onClick={() =>
            action !== Action.SIMULATING && setAction(Action.CHOOSE_OBSTACLES)
          }
          disabled={action === Action.SIMULATING}
        >
          Choose Obstacles
        </button>
        <button
          onClick={() => {
            if (action === Action.SIMULATING) {
                return;
            }
            setAction(Action.CHOOSE_OBSTACLES);
            genRandomObstacles();
          }}
          disabled={action === Action.SIMULATING}
        >
          Random Obstacles
        </button>
        <button
          onClick={() => action !== Action.SIMULATING && startSimulation()}
          disabled={(action !== Action.SIMULATING && (!hasSource || !hasTarget)) || action === Action.SIMULATING}
        >
          {action === Action.SIMULATING ? "Stop" : "Simulate"}
        </button>
        <button
          disabled={action === Action.SIMULATING}
          onClick={() => clearPrevSimulation()}
        >
          Clear Path
        </button>
      </div>
      <h2>{geth2Text()}</h2>
      <div
        style={{
          width: gridWidth * cellSize,
          height: gridHeight * cellSize,
          backgroundColor: "white",
        }}
      >
        {Array.from({ length: gridHeight }, (_, rowIndex) => (
          <div key={rowIndex} style={{ display: "flex" }}>
            {Array.from({ length: gridWidth }, (_, colIndex) => (
              <div
                id={(gridWidth * rowIndex + colIndex).toString()}
                className="free"
                key={colIndex}
                style={{
                  width: cellSize,
                  height: cellSize,
                  border: "0.5px solid black",
                }}
                onClick={() =>
                  onCellClick((gridWidth * rowIndex + colIndex).toString())
                }
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export default AlgVisualizer;
