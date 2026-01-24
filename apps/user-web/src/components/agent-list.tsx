"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  agents,
  departments,
  departmentLabels,
  departmentDescriptions,
  type Agent,
  type Department,
} from "@/components/agent-viz/agent-data";

function AgentCard({
  agent,
  isExpanded,
  onToggle,
}: {
  agent: Agent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={onToggle}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </CardHeader>

      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0">
            <p className="mb-4 text-xs leading-relaxed text-text-secondary">
              {agent.description}
            </p>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Skills
              </p>
              <ul className="space-y-1">
                {agent.skills.map((skill) => (
                  <li
                    key={skill}
                    className="flex items-start gap-2 text-xs text-text-secondary"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

function DepartmentSection({
  department,
  agents,
  expandedAgents,
  onToggleAgent,
  isFirst,
}: {
  department: Department;
  agents: Agent[];
  expandedAgents: Set<string>;
  onToggleAgent: (id: string) => void;
  isFirst: boolean;
}) {
  const label = departmentLabels[department];
  const description = departmentDescriptions[department];

  return (
    <section className={isFirst ? "" : "mt-40"}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">{label}</h2>
        <p className="mt-1 text-sm text-text-tertiary">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isExpanded={expandedAgents.has(agent.id)}
            onToggle={() => onToggleAgent(agent.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function AgentList() {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const toggleAgent = (id: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group agents by department
  const agentsByDepartment = departments.reduce(
    (acc, dept) => {
      acc[dept] = agents.filter((a) => a.department === dept);
      return acc;
    },
    {} as Record<Department, Agent[]>
  );

  return (
    <div>
      {departments.map((dept, index) => (
        <DepartmentSection
          key={dept}
          department={dept}
          agents={agentsByDepartment[dept]}
          expandedAgents={expandedAgents}
          onToggleAgent={toggleAgent}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}
