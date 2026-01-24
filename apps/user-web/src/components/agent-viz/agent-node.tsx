"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "motion/react";
import { departmentColors, type Department } from "./agent-data";

// Root node (top of hierarchy)
export interface RootNodeData {
  label: string;
}

function RootNodeComponent({ data }: { data: RootNodeData }) {
  return (
    <>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <div className="rounded-lg border-2 border-gray-800 bg-gray-900 px-4 py-2 shadow-lg">
        <div className="text-center">
          <div className="text-xs font-semibold text-white">{data.label}</div>
          <div className="text-[10px] text-gray-400">Agent Organization</div>
        </div>
      </div>
    </>
  );
}

export const RootNode = memo(RootNodeComponent);

// Department node (middle row)
export interface DepartmentNodeData {
  label: string;
  department: Department;
  agentCount: number;
  isActive?: boolean;
}

function DepartmentNodeComponent({ data }: { data: DepartmentNodeData }) {
  const { label, department, agentCount, isActive = false } = data;
  const color = departmentColors[department];

  return (
    <>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />

      <motion.div
        className="rounded-lg border-2 px-3 py-1.5 shadow-md transition-all"
        style={{
          backgroundColor: isActive ? color : "white",
          borderColor: color,
        }}
        animate={{
          scale: isActive ? 1.05 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="text-center">
          <div
            className="text-xs font-semibold"
            style={{ color: isActive ? "white" : color }}
          >
            {label}
          </div>
          <div
            className="text-[10px]"
            style={{ color: isActive ? "rgba(255,255,255,0.8)" : "#9CA3AF" }}
          >
            {agentCount} Agents
          </div>
        </div>
      </motion.div>
    </>
  );
}

export const DepartmentNode = memo(DepartmentNodeComponent);

// Agent node (bottom row)
export interface AgentNodeData {
  label: string;
  department: Department;
  isActive?: boolean;
  pulseIntensity?: number;
}

function AgentNodeComponent({ data }: { data: AgentNodeData }) {
  const { label, department, isActive = false, pulseIntensity = 0 } = data;
  const color = departmentColors[department];

  return (
    <>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      <div className="group relative">
        {/* Ripple effect when active */}
        {isActive && (
          <>
            <motion.div
              className="absolute inset-0 rounded"
              style={{ backgroundColor: color }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </>
        )}

        {/* Main node - rectangular like mermaid */}
        <motion.div
          className="relative rounded border bg-white px-2 py-1 shadow-sm transition-shadow"
          style={{
            borderColor: isActive ? color : "#D1D5DB",
            boxShadow: isActive
              ? `0 0 12px ${color}40, 0 2px 4px rgba(0,0,0,0.1)`
              : "0 1px 3px rgba(0,0,0,0.1)",
          }}
          animate={{
            scale: isActive ? 1 + pulseIntensity * 0.1 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <span
            className="whitespace-nowrap text-[10px] font-medium"
            style={{ color: isActive ? color : "#374151" }}
          >
            {label}
          </span>
        </motion.div>
      </div>
    </>
  );
}

export const AgentNode = memo(AgentNodeComponent);
