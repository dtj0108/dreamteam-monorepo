"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  agents,
  connections,
  departments,
  departmentColors,
  departmentLabels,
  taskTemplates,
  messageTemplates,
  type Department,
  type AgentStatus,
} from "./agent-data";

// Activity log entry type
interface ActivityEntry {
  id: number;
  timestamp: string;
  type: "task" | "message" | "complete";
  agentName: string;
  agentDepartment: Department;
  targetAgentName?: string;
  targetDepartment?: Department;
  content: string;
}

// Agent state with status
interface AgentState {
  id: string;
  status: AgentStatus;
  task?: string;
}

// Animated particle along a connection
interface Particle {
  id: number;
  fromId: string;
  toId: string;
  color: string;
  progress: number;
}

// Format time as HH:MM:SS
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Department cluster positions (center of each cluster) - spread out more
const clusterPositions: Record<Department, { x: number; y: number }> = {
  leadership: { x: 550, y: 100 },
  execution: { x: 180, y: 290 },
  sales: { x: 550, y: 290 },
  marketing: { x: 920, y: 290 },
  finance: { x: 220, y: 490 },
  systems: { x: 550, y: 490 },
  people: { x: 880, y: 490 },
};

// Generate agent numbers (1-38) grouped by department
const agentNumbers: Record<string, number> = {};
let agentNum = 1;
departments.forEach((dept) => {
  agents.filter((a) => a.department === dept).forEach((agent) => {
    agentNumbers[agent.id] = agentNum++;
  });
});

// Generate positions for agents within a department cluster
function generateAgentPositions(): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  departments.forEach((dept) => {
    const center = clusterPositions[dept];
    const deptAgents = agents.filter((a) => a.department === dept);
    const radius = 65; // Radius for agent circle

    deptAgents.forEach((agent, i) => {
      // Offset angle slightly for better spacing
      const angle = (i / deptAgents.length) * Math.PI * 2 - Math.PI / 2;
      positions[agent.id] = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    });
  });

  return positions;
}

// Get department agent range for legend (e.g., "1-5")
function getDeptAgentRange(dept: Department): string {
  const deptAgents = agents.filter((a) => a.department === dept);
  const nums = deptAgents.map((a) => agentNumbers[a.id]);
  return `${Math.min(...nums)}-${Math.max(...nums)}`;
}

const agentPositions = generateAgentPositions();

// Activity Log Component
function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              className="mb-1.5"
            >
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-[10px] text-gray-400">
                    {entry.timestamp}
                  </span>
                  <div className="min-w-0 flex-1">
                    {entry.type === "message" ? (
                      <p className="text-xs text-gray-700">
                        <span
                          className="font-medium"
                          style={{ color: departmentColors[entry.agentDepartment] }}
                        >
                          {entry.agentName}
                        </span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span
                          className="font-medium"
                          style={{ color: departmentColors[entry.targetDepartment!] }}
                        >
                          {entry.targetAgentName}
                        </span>
                        <span className="text-gray-500">: "{entry.content}"</span>
                      </p>
                    ) : entry.type === "complete" ? (
                      <p className="text-xs text-gray-700">
                        <span
                          className="font-medium"
                          style={{ color: departmentColors[entry.agentDepartment] }}
                        >
                          {entry.agentName}
                        </span>
                        <span className="ml-1 text-green-600">✓ {entry.content}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-700">
                        <span
                          className="font-medium"
                          style={{ color: departmentColors[entry.agentDepartment] }}
                        >
                          {entry.agentName}
                        </span>
                        <span className="ml-1 text-gray-500">{entry.content}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Legend Component
function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 rounded-lg bg-white px-4 py-2 shadow-sm border border-gray-100">
      {departments.map((dept) => {
        const color = departmentColors[dept];
        const range = getDeptAgentRange(dept);
        return (
          <div key={dept} className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[11px] text-gray-600">
              {departmentLabels[dept]}
            </span>
            <span className="text-[10px] text-gray-400">({range})</span>
          </div>
        );
      })}
    </div>
  );
}

// Molecular Network SVG
function MolecularNetwork({
  agentStates,
  particles,
  activeConnectionIndex,
}: {
  agentStates: Map<string, AgentState>;
  particles: Particle[];
  activeConnectionIndex: number;
}) {
  // Get cross-department connections
  const crossDeptConnections = connections.filter((conn) => {
    const fromAgent = agents.find((a) => a.id === conn.source);
    const toAgent = agents.find((a) => a.id === conn.target);
    return fromAgent?.department !== toAgent?.department;
  });

  return (
    <svg viewBox="0 0 1100 620" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {/* Department cluster backgrounds */}
      {departments.map((dept) => {
        const center = clusterPositions[dept];
        const color = departmentColors[dept];
        return (
          <g key={`cluster-${dept}`}>
            {/* Subtle background circle */}
            <circle
              cx={center.x}
              cy={center.y}
              r={110}
              fill={color}
              opacity={0.06}
            />
            {/* Department label */}
            <text
              x={center.x}
              y={center.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="500"
              fill={color}
              opacity={0.4}
            >
              {departmentLabels[dept]}
            </text>
          </g>
        );
      })}

      {/* Connection lines (bonds) */}
      {connections.map((conn, i) => {
        const from = agentPositions[conn.source];
        const to = agentPositions[conn.target];
        if (!from || !to) return null;

        const fromAgent = agents.find((a) => a.id === conn.source);
        const toAgent = agents.find((a) => a.id === conn.target);
        const isCrossDept = fromAgent?.department !== toAgent?.department;

        // Check if this cross-dept connection is active
        const crossDeptIndex = isCrossDept ? crossDeptConnections.findIndex(
          (c) => c.source === conn.source && c.target === conn.target
        ) : -1;
        const isActive = isCrossDept && (
          crossDeptIndex === activeConnectionIndex ||
          crossDeptIndex === (activeConnectionIndex + 1) % crossDeptConnections.length ||
          crossDeptIndex === (activeConnectionIndex + 2) % crossDeptConnections.length
        );

        if (isCrossDept) {
          return (
            <line
              key={`conn-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isActive ? "#3B82F6" : "#D1D5DB"}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray="4 4"
              opacity={isActive ? 0.8 : 0.3}
              style={{
                transition: "all 0.5s ease-in-out",
              }}
            />
          );
        }

        return (
          <line
            key={`conn-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#6B7280"
            strokeWidth={1.5}
            opacity={0.4}
          />
        );
      })}


      {/* Agent nodes (atoms) */}
      {agents.map((agent) => {
        const pos = agentPositions[agent.id];
        if (!pos) return null;

        const state = agentStates.get(agent.id);
        const status = state?.status || "idle";
        const color = departmentColors[agent.department];
        const isProcessing = status === "processing";
        const isCompleted = status === "completed";
        const num = agentNumbers[agent.id];

        return (
          <g key={agent.id}>
            {/* Node background */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={12}
              fill={isProcessing ? color : "white"}
              stroke={isProcessing ? color : isCompleted ? "#22C55E" : color}
              strokeWidth={isProcessing || isCompleted ? 2 : 1.5}
              opacity={isProcessing ? 1 : isCompleted ? 1 : 0.8}
              style={{
                filter: isProcessing ? `drop-shadow(0 0 8px ${color})` : undefined,
              }}
            />

            {/* Agent number */}
            <text
              x={pos.x}
              y={pos.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fontWeight="600"
              fill={isProcessing ? "white" : "#374151"}
            >
              {num}
            </text>

            {/* Status indicator dot */}
            {(isProcessing || isCompleted || status === "waiting") && (
              <circle
                cx={pos.x + 8}
                cy={pos.y - 8}
                r={3.5}
                fill={
                  isProcessing
                    ? "#3B82F6"
                    : isCompleted
                    ? "#22C55E"
                    : "#EAB308"
                }
                stroke="white"
                strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Main component
export function AgentNetwork() {
  const [agentStates, setAgentStates] = useState<Map<string, AgentState>>(new Map());
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [activeConnectionIndex, setActiveConnectionIndex] = useState(0);

  const activityIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const messageCountRef = useRef(0);

  // Add activity entry
  const addActivity = useCallback((entry: Omit<ActivityEntry, "id" | "timestamp">) => {
    setActivityLog((prev) => [
      {
        ...entry,
        id: activityIdRef.current++,
        timestamp: formatTime(new Date()),
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Set agent status
  const setAgentStatus = useCallback((agentId: string, status: AgentStatus, task?: string) => {
    setAgentStates((prev) => {
      const next = new Map(prev);
      next.set(agentId, { id: agentId, status, task });
      return next;
    });
  }, []);

  // Add animated particle
  const addParticle = useCallback((fromId: string, toId: string, color: string) => {
    const particleId = particleIdRef.current++;
    const startTime = Date.now();
    const duration = 2000; // Slower particle travel

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setParticles((prev) => {
        const existing = prev.find((p) => p.id === particleId);
        if (progress >= 1) {
          return prev.filter((p) => p.id !== particleId);
        }
        if (existing) {
          return prev.map((p) =>
            p.id === particleId ? { ...p, progress } : p
          );
        }
        return [...prev, { id: particleId, fromId, toId, color, progress }];
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Animation loop
  useEffect(() => {
    const runAgentTask = () => {
      const dept = randomItem(departments);
      const deptAgents = agents.filter((a) => a.department === dept);
      const agent = randomItem(deptAgents);
      const task = randomItem(taskTemplates[dept]);

      setAgentStatus(agent.id, "processing", task);

      addActivity({
        type: "task",
        agentName: agent.name,
        agentDepartment: dept,
        content: task,
      });

      setTimeout(() => {
        setAgentStatus(agent.id, "completed");
        setTotalTasks((prev) => prev + 1);

        addActivity({
          type: "complete",
          agentName: agent.name,
          agentDepartment: dept,
          content: "Completed",
        });

        setTimeout(() => {
          setAgentStatus(agent.id, "idle");
        }, 1500);
      }, 3000 + Math.random() * 1500);
    };

    const runCrossDeptMessage = () => {
      const connIndex = Math.floor(Math.random() * messageTemplates.length);
      const conn = messageTemplates[connIndex];
      const message = randomItem(conn.messages);

      const fromAgents = agents.filter((a) => a.department === conn.from);
      const toAgents = agents.filter((a) => a.department === conn.to);
      const fromAgent = randomItem(fromAgents);
      const toAgent = randomItem(toAgents);

      setAgentStatus(fromAgent.id, "processing");
      setAgentStatus(toAgent.id, "waiting");

      // Add particle animation
      addParticle(fromAgent.id, toAgent.id, departmentColors[conn.from]);
      messageCountRef.current++;

      addActivity({
        type: "message",
        agentName: fromAgent.name,
        agentDepartment: conn.from,
        targetAgentName: toAgent.name,
        targetDepartment: conn.to,
        content: message,
      });

      setTimeout(() => {
        setAgentStatus(fromAgent.id, "idle");
        setAgentStatus(toAgent.id, "processing");

        setTimeout(() => {
          setAgentStatus(toAgent.id, "idle");
        }, 1500);
      }, 2500);
    };

    // Run initial activity after a delay
    setTimeout(runAgentTask, 500);

    // Schedule regular activities - much slower
    const taskInterval = setInterval(runAgentTask, 5000);
    const messageInterval = setInterval(runCrossDeptMessage, 7000);

    return () => {
      clearInterval(taskInterval);
      clearInterval(messageInterval);
    };
  }, [addActivity, setAgentStatus, addParticle]);

  // Cycle through active connections
  useEffect(() => {
    const connectionInterval = setInterval(() => {
      setActiveConnectionIndex((prev) => (prev + 1) % 12); // Cycle through connections
    }, 2000);

    return () => clearInterval(connectionInterval);
  }, []);

  const activeCount = Array.from(agentStates.values()).filter(
    (s) => s.status === "processing"
  ).length;

  return (
    <div className="relative flex h-full overflow-hidden bg-gray-50">
      {/* Main visualization area */}
      <div className="flex flex-1 flex-col p-3">
        {/* Legend at top */}
        <div className="mb-2">
          <Legend />
        </div>

        {/* Molecular network */}
        <div className="relative min-h-0 flex-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {/* Stats overlay - top left */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-4 rounded-lg bg-white/95 px-4 py-2.5 shadow-sm border border-gray-100">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Tasks</div>
              <div className="font-mono text-lg font-bold text-gray-900">
                {totalTasks.toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Active</div>
              <div className="font-mono text-lg font-bold text-blue-600">
                {activeCount}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Agents</div>
              <div className="font-mono text-lg font-bold text-gray-900">38</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Depts</div>
              <div className="font-mono text-lg font-bold text-gray-900">7</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="size-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>
          <MolecularNetwork agentStates={agentStates} particles={particles} activeConnectionIndex={activeConnectionIndex} />
        </div>
      </div>

      {/* Activity log sidebar */}
      <div className="w-72 border-l border-gray-200 bg-gray-50 p-3">
        <ActivityLog entries={activityLog} />
      </div>
    </div>
  );
}
