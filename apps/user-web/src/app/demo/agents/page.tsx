import AgentFeatures from '@/components/shadcn-studio/blocks/features-section-14/features-section-14'
import type { NotificationCard } from '@/components/shadcn-studio/blocks/features-section-14/notification-stack'
import { agents, agentEmojis, departmentColors, departmentLabels } from '@/components/agent-viz/agent-data'

// Create agent notifications from real agent data
const notifications: NotificationCard[] = [
  {
    id: '1',
    name: 'CEO Agent',
    time: 'Just now',
    message: 'Reviewing Q4 priorities',
    emoji: agentEmojis['ceo'],
    fallback: 'CEO'
  },
  {
    id: '2',
    name: 'Sales Strategist',
    time: '2 min ago',
    message: 'Pipeline analysis complete',
    emoji: agentEmojis['sales-strategist'],
    fallback: 'SS'
  },
  {
    id: '3',
    name: 'Marketing Agent',
    time: '5 min ago',
    message: 'Campaign launched',
    emoji: agentEmojis['brand'],
    fallback: 'MA'
  }
]

// Create avatar data from agent emojis
const avatarData = [
  {
    emoji: agentEmojis['ceo'] || '👔',
    fallback: 'CEO',
    name: 'CEO Agent',
    size: 'size-12'
  },
  {
    emoji: agentEmojis['strategy'] || '🎯',
    fallback: 'ST',
    name: 'Strategy Agent',
    size: 'size-16'
  },
  {
    emoji: agentEmojis['sales-strategist'] || '💼',
    fallback: 'SS',
    name: 'Sales Strategist',
    size: 'size-20'
  },
  {
    emoji: agentEmojis['brand'] || '✨',
    fallback: 'BR',
    name: 'Brand Agent',
    size: 'size-16'
  },
  {
    emoji: agentEmojis['automation-architect'] || '⚙️',
    fallback: 'AA',
    name: 'Automation Architect',
    size: 'size-12'
  }
]

// Department badges using real department data (6 departments - 3 per side)
const departments = [
  { name: departmentLabels.leadership, emoji: '👔', color: departmentColors.leadership },
  { name: departmentLabels.sales, emoji: '💼', color: departmentColors.sales },
  { name: departmentLabels.finance, emoji: '💵', color: departmentColors.finance },
  { name: departmentLabels.marketing, emoji: '✨', color: departmentColors.marketing },
  { name: departmentLabels.systems, emoji: '⚙️', color: departmentColors.systems },
  { name: departmentLabels.execution, emoji: '📊', color: departmentColors.execution },
]

export default function AgentsPage() {
  return (
    <div className='min-h-screen bg-white'>
      <AgentFeatures
        notifications={notifications}
        avatarData={avatarData}
        departments={departments}
        agentCount={agents.length}
      />
    </div>
  )
}
