"use client";

import {
  departmentLabels,
  agentEmojis,
  type Agent,
} from "@/components/agent-viz/agent-data";

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const deptLabel = departmentLabels[agent.department];
  const emoji = agentEmojis[agent.id] || "🤖";

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center p-6 text-center transition-transform duration-200 hover:-translate-y-1"
    >
      {/* Circular emoji avatar - neutral grey */}
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-3xl transition-transform duration-200 group-hover:scale-105">
        {emoji}
      </div>

      {/* Agent name */}
      <h3 className="mb-1 font-semibold text-gray-900">{agent.name}</h3>

      {/* Department label - grey */}
      <p className="text-sm text-gray-500">{deptLabel}</p>
    </button>
  );
}
