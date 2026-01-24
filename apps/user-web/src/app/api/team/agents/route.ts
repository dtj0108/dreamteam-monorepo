import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"

// Project Planner skill content
const PROJECT_PLANNER_SKILL_CONTENT = `# Project Planner Skill

## When to Use
Use this skill when a user:
- Describes something they want to achieve or build
- Asks you to create a project or plan
- Says "I want to..." or "We need to..." followed by a goal
- Requests help organizing or breaking down work

## Execution Flow

### Step 1: Understand Requirements
Before creating anything, ensure you understand:
- What is the end goal?
- Who is involved?
- What is the timeline?
- What are the constraints?

Ask clarifying questions if any of these are unclear.

### Step 2: Design the Project Structure
Break down the work into:
- **Phases**: Logical groupings of related work
- **Tasks**: Individual actionable items (1-8 hours each)
- **Dependencies**: Which tasks must complete before others can start

### Step 3: Create the Project
Use the manageProjects tool with action "create":
- Set a clear, descriptive name
- Write a comprehensive description
- Set appropriate priority (low, medium, high, critical)
- Set start_date and target_end_date if known

### Step 4: Create Tasks
For each task, use the manageProjectTasks tool with action "create":
- projectId: The ID of the project you just created
- title: Clear, actionable title
- description: Detailed description with acceptance criteria
- priority: Based on importance and urgency (low, medium, high, urgent)
- dueDate: Due date in ISO format based on dependencies and timeline
- estimatedHours: Estimated hours to complete

### Step 5: Auto-Assign Tasks
Use getTeamMembers tool to get workspace members with their:
- Current roles
- Current workload (open task count)

Then use manageProjectTasks tool with action "assign" for each task:
- taskId: The ID of the task to assign
- assigneeId: The ID of the team member to assign

Assignment algorithm:
1. Match task's suggested role to member roles
2. Among role matches, pick the member with lowest workload
3. If no role match, distribute evenly by workload

### Step 6: Create Documentation Page
Use manageKnowledge tool with action "create" to create an execution guide:

Structure the page as:

# [Project Name] - Execution Guide

## Overview
[Brief summary of what this project achieves]

## Team
[List of team members and their roles on this project]

## Timeline
- Start: [date]
- Target Completion: [date]

## Phase 1: [Phase Name]

### Task: [Task Title]
- **Assignee**: [Name]
- **Priority**: [Priority]
- **Due**: [Date]
- **Estimated Time**: [Hours] hours

**Description**:
[What needs to be done]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

[Repeat for each task...]

## Success Criteria
How we know the project is complete:
- [ ] All tasks completed
- [ ] [Specific deliverables]

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk 1] | [Impact] | [How to handle] |

### Step 7: Summarize for User
After creating everything, provide a summary:
- Project name and link
- Number of tasks created
- Team members assigned
- Documentation page link
- Next steps / first tasks to tackle

## Best Practices

### Task Granularity
- Each task should be completable in 1-8 hours
- If a task is larger, break it into subtasks
- Use clear, verb-first titles: "Implement...", "Design...", "Review..."

### Prioritization
- **Urgent**: Blocking other work or time-sensitive
- **High**: Critical path items
- **Medium**: Important but not blocking
- **Low**: Nice-to-have or can wait

### Role Assignment
Map work types to roles:
- **owner**: Business decisions, approvals, stakeholder communication
- **admin**: System configuration, access management, infrastructure
- **developer**: Technical implementation, coding, debugging
- **designer**: UI/UX design, visual assets, user research
- **member**: General tasks, documentation, testing, support
`

// Default skills to seed for new workspaces
const DEFAULT_SKILLS = [
  {
    name: "project-planner",
    display_name: "Project Planner",
    description: "Create complete project plans from user requirements. Use when users describe what they want to achieve, need a project created, or ask to plan something.",
    icon: "📋",
    is_system: true,
    content: PROJECT_PLANNER_SKILL_CONTENT,
    // Assign to these agents by name
    assign_to_agents: ["Project Manager"],
  },
]

// Default agents to seed for new workspaces
const DEFAULT_AGENTS = [
  {
    name: "Budget Coach",
    description: "Helps users understand spending and create budgets",
    avatar_url: "💰",
    system_prompt: `You are a friendly budget coach. Help users understand their spending patterns, create realistic budgets, and stay accountable. When users overspend, be encouraging not judgmental. Always suggest specific, actionable steps.

When analyzing spending:
- Look for patterns and trends
- Compare to budget limits
- Suggest categories that could be reduced
- Celebrate wins and progress

Be conversational and supportive. Use the tools available to get real data before making recommendations.`,
    tools: ["budgets", "transactions"],
  },
  {
    name: "Sales Agent",
    description: "Manages leads, tracks pipeline, handles follow-ups",
    avatar_url: "🤝",
    system_prompt: `You are a proactive sales assistant. Help users manage their leads, track opportunities through the pipeline, and never miss follow-ups.

Your priorities:
- Surface overdue tasks and urgent follow-ups
- Track opportunity values and close probabilities
- Suggest next actions for each lead
- Keep responses concise and action-oriented

When asked about pipeline, calculate weighted values and highlight deals that need attention.`,
    tools: ["leads", "opportunities", "tasks"],
  },
  {
    name: "Investment Advisor",
    description: "Tracks goals and analyzes account balances",
    avatar_url: "📈",
    system_prompt: `You are a knowledgeable investment advisor. Help users set financial goals, track progress, and understand their account balances.

Guidelines:
- Provide balanced advice about saving vs spending
- Track goal progress and celebrate milestones
- Analyze account balances and net worth
- Never give specific stock picks or investment advice
- Focus on goal-based planning

Be informative but cautious. Always remind users to consult a financial professional for major decisions.`,
    tools: ["accounts", "goals"],
  },
  {
    name: "Expense Auditor",
    description: "Finds unusual spending and creates reports",
    avatar_url: "🔍",
    system_prompt: `You are a meticulous expense auditor. Your job is to find unusual spending, identify potential savings, and help users categorize transactions correctly.

When auditing:
- Flag transactions that seem unusual or duplicated
- Identify subscription services that may be forgotten
- Find opportunities to reduce recurring expenses
- Create detailed reports when asked
- Be thorough and detail-oriented

Export data when users need documentation or records.`,
    tools: ["transactions", "dataExport"],
  },
  {
    name: "Project Manager",
    description: "Creates comprehensive project plans with tasks, team assignments, and documentation",
    avatar_url: "📋",
    system_prompt: `You are an expert project manager AI assistant. When users describe what they want to achieve, you create comprehensive project plans.

YOUR CAPABILITIES:
- Create complete project plans with structured tasks
- Automatically assign tasks to team members based on their roles and current workload
- Generate detailed documentation explaining how to execute each part of the project
- Break down complex requirements into actionable, well-organized tasks

WHEN A USER DESCRIBES A GOAL OR PROJECT:
1. First, understand the full scope by asking clarifying questions if needed
2. Think through the work breakdown structure
3. Create the project using manageProjects tool
4. Create all tasks using manageProjectTasks tool with action "create"
5. Get team members using getTeamMembers to understand roles and workload
6. Assign tasks using manageProjectTasks tool with action "assign"
7. Create a comprehensive knowledge page using manageKnowledge tool

TASK BREAKDOWN BEST PRACTICES:
- Each task should be completable in 1-8 hours ideally
- Include clear acceptance criteria in task descriptions
- Set realistic due dates based on dependencies
- Consider parallelization - which tasks can happen simultaneously?

KNOWLEDGE PAGE STRUCTURE:
Your documentation should include:
# [Project Name] - Execution Guide
## Overview - Brief summary of what this project aims to achieve
## Prerequisites - What needs to be in place before starting
## Phase 1: [Phase Name]
### Task: [Task Name]
- Assignee, Duration, Steps, Deliverables, Dependencies
## Success Criteria - How we know the project is complete
## Risks & Mitigations - Potential issues and how to handle them

ROLE SUGGESTIONS FOR AUTO-ASSIGNMENT:
- owner: Business decisions, approvals
- admin: System configuration, access management
- developer: Technical implementation
- designer: UI/UX, visual assets
- member: General tasks, documentation

Always be thorough but efficient. Create plans that are actionable and clear.`,
    tools: ["projects", "projectTasks", "knowledge", "teamMembers"],
  },
  {
    name: "Report Generator",
    description: "Creates financial summaries and exports data",
    avatar_url: "📊",
    system_prompt: `You are a skilled report generator. Create clear, comprehensive financial reports and summaries.

When generating reports:
- Summarize spending patterns and trends
- Compare current vs previous periods
- Highlight key insights and anomalies
- Format data clearly for stakeholders
- Export in useful formats when requested

Be thorough but concise. Focus on actionable insights.`,
    tools: ["transactions", "accounts", "dataExport"],
  },
  {
    name: "Knowledge Curator",
    description: "Manages documentation, SOPs, and team knowledge",
    avatar_url: "📚",
    system_prompt: `You are a helpful knowledge curator. Help users organize, find, and maintain team knowledge.

Your role:
- Create and update documentation pages and SOPs
- Search existing pages to find answers
- Help maintain and organize the knowledge base
- Research external topics using web search when needed

When asked to write or create something:
- Use the knowledge tool with action "create" to save it as a page
- Structure content with clear headings and sections
- Use markdown formatting (# headings, - bullets, 1. numbered lists)

Be the team's librarian - helpful, thorough, and always ready to find or create answers.`,
    tools: ["knowledge", "webSearch"],
  },
]

// Helper function to seed default skills for a workspace
async function seedDefaultSkills(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  userId: string,
  agents: any[]
) {
  try {
    // Check if skills already exist for this workspace
    const { data: existingSkills } = await supabase
      .from("agent_skills")
      .select("name")
      .eq("workspace_id", workspaceId)
      .limit(1)

    if (existingSkills && existingSkills.length > 0) {
      // Skills already seeded
      return
    }

    // Insert default skills
    for (const skillDef of DEFAULT_SKILLS) {
      const { data: skill, error: skillError } = await supabase
        .from("agent_skills")
        .insert({
          workspace_id: workspaceId,
          name: skillDef.name,
          display_name: skillDef.display_name,
          description: skillDef.description,
          icon: skillDef.icon,
          is_system: skillDef.is_system,
          content: skillDef.content,
          created_by: userId,
        })
        .select()
        .single()

      if (skillError) {
        console.error("Error seeding skill:", skillError)
        continue
      }

      // Assign skill to specified agents
      if (skillDef.assign_to_agents && skill) {
        for (const agentName of skillDef.assign_to_agents) {
          const agent = agents.find((a) => a.name === agentName)
          if (agent) {
            await supabase.from("agent_skill_assignments").insert({
              agent_id: agent.id,
              skill_id: skill.id,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error("Error seeding default skills:", error)
  }
}

// GET /api/team/agents - Get all agents for the workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 })
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Get all active agents in the workspace
    let { data: agents, error } = await supabase
      .from("agents")
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching agents:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Collect all unique profile IDs from reports_to arrays
    const allReportsToIds = new Set<string>()
    agents?.forEach((agent: { reports_to?: string[] | null; [key: string]: unknown }) => {
      if (agent.reports_to && Array.isArray(agent.reports_to)) {
        agent.reports_to.forEach((id: string) => allReportsToIds.add(id))
      }
    })

    // Fetch all profiles at once
    let profilesMap: Record<string, { id: string; name: string; avatar_url: string | null }> = {}
    if (allReportsToIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", Array.from(allReportsToIds))

      profiles?.forEach((p: { id: string; name: string; avatar_url: string | null }) => {
        profilesMap[p.id] = p
      })
    }

    // Attach reports_to_profiles to each agent
    const agentsWithProfiles = agents?.map((agent: { reports_to?: string[] | null; [key: string]: unknown }) => ({
      ...agent,
      reports_to_profiles: (agent.reports_to || [])
        .map((id: string) => profilesMap[id])
        .filter(Boolean),
    }))

    // Fetch unread counts for all agents (messages from agent after last_read_at)
    // This is a single efficient query instead of N+1 queries
    const agentIds = agentsWithProfiles?.map((a: { id: string }) => a.id) || []
    const unreadCountsMap: Record<string, number> = {}

    if (agentIds.length > 0) {
      // Get conversations with last_read_at for this user
      const { data: conversations } = await supabase
        .from("agent_conversations")
        .select("id, agent_id, last_read_at")
        .eq("user_id", session.id)
        .in("agent_id", agentIds)

      if (conversations && conversations.length > 0) {
        // For each conversation, count unread assistant messages
        for (const conv of conversations) {
          let query = supabase
            .from("agent_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("role", "assistant")

          // Only count messages after last_read_at (if set)
          if (conv.last_read_at) {
            query = query.gt("created_at", conv.last_read_at)
          }

          const { count } = await query

          if (count && count > 0) {
            unreadCountsMap[conv.agent_id] = count
          }
        }
      }
    }

    // Merge unread counts into agents
    const agentsWithUnread = agentsWithProfiles?.map((agent: { id: string }) => ({
      ...agent,
      unread_count: unreadCountsMap[agent.id] || 0,
    }))

    // Auto-seed default agents if workspace has none
    if (!agentsWithUnread || agentsWithUnread.length === 0) {
      const agentsToInsert = DEFAULT_AGENTS.map((agent) => ({
        workspace_id: workspaceId,
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        system_prompt: agent.system_prompt,
        tools: agent.tools,
        created_by: session.id,
        reports_to: [session.id], // Default to creator as array
      }))

      const { error: insertError } = await supabase
        .from("agents")
        .insert(agentsToInsert)

      if (insertError) {
        console.error("Error seeding default agents:", insertError)
        // Continue without seeding - return empty list
        return NextResponse.json([])
      }

      // Fetch the newly created agents
      const { data: seededAgents, error: fetchError } = await supabase
        .from("agents")
        .select(`
          *,
          creator:created_by(id, name, avatar_url)
        `)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.error("Error fetching seeded agents:", fetchError)
        return NextResponse.json([])
      }

      // For seeded agents, the creator is also in reports_to
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", session.id)
        .single()

      const seededWithProfiles = seededAgents?.map((agent: Record<string, unknown>) => ({
        ...agent,
        reports_to_profiles: creatorProfile ? [creatorProfile] : [],
      }))

      // Also seed default skills for the workspace
      await seedDefaultSkills(supabase, workspaceId, session.id, seededAgents || [])

      return NextResponse.json(seededWithProfiles)
    }

    return NextResponse.json(agentsWithUnread)
  } catch (error) {
    console.error("Error in GET /api/team/agents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/team/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const {
      workspaceId,
      name,
      description,
      systemPrompt,
      tools = [],
      model = "gpt-4o-mini",
      avatarUrl,
      reportsTo
    } = body

    if (!workspaceId || !name || !systemPrompt) {
      return NextResponse.json(
        { error: "Workspace ID, name, and system prompt are required" },
        { status: 400 }
      )
    }

    // Verify user is a member of the workspace
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", session.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      )
    }

    // Validate tools array
    const validTools = [
      "transactions", "budgets", "accounts", "goals", "webSearch", "dataExport",
      // CRM Tools
      "leads", "opportunities", "tasks",
      // Knowledge Tools
      "knowledge",
      // Project Management Tools
      "projects", "projectTasks", "teamMembers",
    ]
    const filteredTools = tools.filter((t: string) => validTools.includes(t))

    // Create the agent (reports_to is now an array)
    const reportsToArray = Array.isArray(reportsTo) ? reportsTo : [session.id]

    const { data: agent, error: createError } = await supabase
      .from("agents")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        system_prompt: systemPrompt.trim(),
        tools: filteredTools,
        model,
        avatar_url: avatarUrl || null,
        created_by: session.id,
        reports_to: reportsToArray,
      })
      .select(`
        *,
        creator:created_by(id, name, avatar_url)
      `)
      .single()

    if (createError) {
      console.error("Error creating agent:", createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Fetch profiles for reports_to array
    let reportsToProfiles: { id: string; name: string; avatar_url: string | null }[] = []
    if (agent.reports_to && agent.reports_to.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", agent.reports_to)

      reportsToProfiles = profiles || []
    }

    return NextResponse.json({
      ...agent,
      reports_to_profiles: reportsToProfiles,
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/team/agents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

