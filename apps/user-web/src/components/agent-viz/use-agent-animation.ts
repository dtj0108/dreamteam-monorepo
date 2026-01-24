"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { agents, connections, type Department } from "./agent-data";

export interface ActiveMessage {
  id: string;
  sourceId: string;
  targetId: string;
  progress: number; // 0 to 1
  color: string;
}

export interface AgentState {
  isActive: boolean;
  pulseIntensity: number; // 0 to 1
}

type AnimationPattern = "cascade" | "department-sync" | "cross-talk";

const PATTERN_DURATION = 15000; // 15 seconds per pattern (slower)
const MESSAGE_DURATION = 2500; // 2.5 seconds for a message to travel (slower)
const MESSAGES_PER_SECOND = 6; // Rate of new messages during active phase (fewer)

// Get agents by department
const agentsByDepartment = agents.reduce(
  (acc, agent) => {
    if (!acc[agent.department]) acc[agent.department] = [];
    acc[agent.department].push(agent.id);
    return acc;
  },
  {} as Record<Department, string[]>
);

// Build adjacency list for cascade
const adjacencyList = new Map<string, string[]>();
connections.forEach(({ source, target }) => {
  if (!adjacencyList.has(source)) adjacencyList.set(source, []);
  if (!adjacencyList.has(target)) adjacencyList.set(target, []);
  adjacencyList.get(source)!.push(target);
  adjacencyList.get(target)!.push(source);
});

export function useAgentAnimation() {
  const [activeAgents, setActiveAgents] = useState<Map<string, AgentState>>(
    new Map()
  );
  const [activeMessages, setActiveMessages] = useState<ActiveMessage[]>([]);
  const [currentPattern, setCurrentPattern] =
    useState<AnimationPattern>("cascade");
  const [messageCount, setMessageCount] = useState(0);
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(null);

  const patternStartTime = useRef(Date.now());
  const messageIdCounter = useRef(0);
  const animationFrame = useRef<number | undefined>(undefined);

  // Get a random connection
  const getRandomConnection = useCallback(() => {
    return connections[Math.floor(Math.random() * connections.length)];
  }, []);

  // Get connections within a department
  const getDepartmentConnections = useCallback((dept: Department) => {
    const deptAgents = new Set(agentsByDepartment[dept]);
    return connections.filter(
      (c) => deptAgents.has(c.source) && deptAgents.has(c.target)
    );
  }, []);

  // Get cross-department connections
  const getCrossDepartmentConnections = useCallback(() => {
    return connections.filter((c) => {
      const sourceAgent = agents.find((a) => a.id === c.source);
      const targetAgent = agents.find((a) => a.id === c.target);
      return sourceAgent?.department !== targetAgent?.department;
    });
  }, []);

  // Spawn a new message
  const spawnMessage = useCallback(
    (sourceId: string, targetId: string, color: string) => {
      const id = `msg-${messageIdCounter.current++}`;
      const newMessage: ActiveMessage = {
        id,
        sourceId,
        targetId,
        progress: 0,
        color,
      };
      setActiveMessages((prev) => [...prev, newMessage]);
      setMessageCount((prev) => prev + 1);

      // Activate source agent
      setActiveAgents((prev) => {
        const next = new Map(prev);
        next.set(sourceId, { isActive: true, pulseIntensity: 1 });
        return next;
      });
    },
    []
  );

  // Main animation loop
  useEffect(() => {
    let lastSpawnTime = 0;
    const departments: Department[] = [
      "leadership",
      "execution",
      "sales",
      "marketing",
      "finance",
      "systems",
      "people",
    ];
    let currentDeptIndex = 0;

    const animate = (time: number) => {
      const elapsed = Date.now() - patternStartTime.current;

      // Switch patterns every PATTERN_DURATION
      if (elapsed >= PATTERN_DURATION) {
        patternStartTime.current = Date.now();
        setCurrentPattern((prev) => {
          if (prev === "cascade") return "department-sync";
          if (prev === "department-sync") return "cross-talk";
          return "cascade";
        });
        setActiveDepartment(null);
        currentDeptIndex = 0;
      }

      // Spawn messages based on current pattern
      const spawnInterval = 1000 / MESSAGES_PER_SECOND;
      if (time - lastSpawnTime > spawnInterval) {
        lastSpawnTime = time;

        if (currentPattern === "cascade") {
          // Cascade: Start from CEO, spread outward
          const visited = new Set<string>();
          const queue = ["ceo"];
          const depth = Math.floor((elapsed / PATTERN_DURATION) * 6); // 0-5 depth levels

          for (let d = 0; d <= depth && queue.length > 0; d++) {
            const levelSize = queue.length;
            for (let i = 0; i < levelSize; i++) {
              const current = queue.shift()!;
              if (visited.has(current)) continue;
              visited.add(current);
              const neighbors = adjacencyList.get(current) || [];
              neighbors.forEach((n) => {
                if (!visited.has(n)) queue.push(n);
              });
            }
          }

          // Pick a random edge from visited nodes
          const visitedArr = Array.from(visited);
          if (visitedArr.length > 1) {
            const source =
              visitedArr[Math.floor(Math.random() * visitedArr.length)];
            const neighbors = (adjacencyList.get(source) || []).filter((n) =>
              visited.has(n)
            );
            if (neighbors.length > 0) {
              const target =
                neighbors[Math.floor(Math.random() * neighbors.length)];
              const agent = agents.find((a) => a.id === source);
              const color = agent
                ? `var(--dept-${agent.department})`
                : "#3B82F6";
              spawnMessage(source, target, color);
            }
          }
        } else if (currentPattern === "department-sync") {
          // Activate one department at a time
          const deptDuration = PATTERN_DURATION / departments.length;
          currentDeptIndex = Math.floor(elapsed / deptDuration);
          if (currentDeptIndex >= departments.length)
            currentDeptIndex = departments.length - 1;

          const dept = departments[currentDeptIndex];
          setActiveDepartment(dept);
          const deptConnections = getDepartmentConnections(dept);
          if (deptConnections.length > 0) {
            const conn =
              deptConnections[
                Math.floor(Math.random() * deptConnections.length)
              ];
            spawnMessage(conn.source, conn.target, `var(--dept-${dept})`);
          }
        } else if (currentPattern === "cross-talk") {
          // Cross-department chaos
          const crossConns = getCrossDepartmentConnections();
          if (crossConns.length > 0) {
            const conn =
              crossConns[Math.floor(Math.random() * crossConns.length)];
            const agent = agents.find((a) => a.id === conn.source);
            spawnMessage(
              conn.source,
              conn.target,
              `var(--dept-${agent?.department || "leadership"})`
            );
          }
          // Also add some random internal messages
          if (Math.random() > 0.5) {
            const conn = getRandomConnection();
            const agent = agents.find((a) => a.id === conn.source);
            spawnMessage(
              conn.source,
              conn.target,
              `var(--dept-${agent?.department || "leadership"})`
            );
          }
        }
      }

      // Update message progress
      setActiveMessages((prev) => {
        const updated = prev
          .map((msg) => ({
            ...msg,
            progress: msg.progress + 16 / MESSAGE_DURATION, // ~60fps
          }))
          .filter((msg) => msg.progress < 1);

        // Activate target agents when messages arrive
        prev.forEach((msg) => {
          if (msg.progress >= 0.9 && msg.progress < 0.95) {
            setActiveAgents((agents) => {
              const next = new Map(agents);
              next.set(msg.targetId, { isActive: true, pulseIntensity: 1 });
              return next;
            });
          }
        });

        return updated;
      });

      // Decay agent activity
      setActiveAgents((prev) => {
        const next = new Map(prev);
        next.forEach((state, id) => {
          const newIntensity = state.pulseIntensity * 0.95;
          if (newIntensity < 0.1) {
            next.delete(id);
          } else {
            next.set(id, { ...state, pulseIntensity: newIntensity });
          }
        });
        return next;
      });

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [
    currentPattern,
    spawnMessage,
    getDepartmentConnections,
    getCrossDepartmentConnections,
    getRandomConnection,
  ]);

  return {
    activeAgents,
    activeMessages,
    currentPattern,
    messageCount,
    activeDepartment,
  };
}
