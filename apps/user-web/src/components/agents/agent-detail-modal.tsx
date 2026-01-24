"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@dreamteam/ui/dialog";
import { ArrowRight, Link2 } from "lucide-react";
import {
  agents,
  connections,
  departmentLabels,
  agentEmojis,
  type Agent,
} from "@/components/agent-viz/agent-data";

interface AgentDetailModalProps {
  agent: Agent | null;
  onClose: () => void;
  onNavigateToAgent: (agent: Agent) => void;
}

export function AgentDetailModal({
  agent,
  onClose,
  onNavigateToAgent,
}: AgentDetailModalProps) {
  if (!agent) return null;

  const deptLabel = departmentLabels[agent.department];
  const emoji = agentEmojis[agent.id] || "🤖";

  // Find connected agents
  const connectedAgentIds = connections
    .filter((c: { source: string; target: string }) => c.source === agent.id || c.target === agent.id)
    .map((c: { source: string; target: string }) => (c.source === agent.id ? c.target : c.source));

  const connectedAgents = agents.filter((a: Agent) =>
    connectedAgentIds.includes(a.id)
  );

  return (
    <Dialog open={!!agent} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          {/* Department badge - grey */}
          <div className="mb-1 inline-block w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {deptLabel}
          </div>

          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{emoji}</span>
            {agent.name}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {agent.description}
          </DialogDescription>
        </DialogHeader>

        {/* Skills section */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Skills & Capabilities
          </h4>
          <div className="flex flex-wrap gap-2">
            {agent.skills.map((skill: string) => (
              <span
                key={skill}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Connected agents section */}
        {connectedAgents.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Link2 className="h-3.5 w-3.5 text-gray-400" />
              Connected Agents ({connectedAgents.length})
            </h4>
            <div className="space-y-2">
              {connectedAgents.map((connectedAgent: Agent) => {
                const connEmoji = agentEmojis[connectedAgent.id] || "🤖";
                return (
                  <button
                    key={connectedAgent.id}
                    onClick={() => onNavigateToAgent(connectedAgent)}
                    className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                  >
                    <div className="flex items-center gap-3">
                      {/* Emoji indicator */}
                      <span className="text-lg">{connEmoji}</span>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {connectedAgent.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {departmentLabels[connectedAgent.department]}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
