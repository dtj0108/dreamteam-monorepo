"use client";

import { CheckSquare, Clock } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ProductLanding, type ProductFeature, type ProductCapability } from "@/components/marketing/product-landing";
import { cx } from "@/lib/cx";

// Hero Dashboard Preview Component
const ProjectsPreview = () => (
    <div className="rounded-xl bg-bg-primary p-2 shadow-2xl ring-1 ring-border-secondary md:p-3">
        {/* Fake browser chrome */}
        <div className="mb-2 flex items-center gap-1.5 px-2">
            <div className="size-2.5 rounded-full bg-error-400" />
            <div className="size-2.5 rounded-full bg-warning-400" />
            <div className="size-2.5 rounded-full bg-success-400" />
            <div className="ml-3 flex-1 rounded bg-bg-tertiary px-3 py-1 text-[10px] text-text-quaternary">
                app.dreamteam.ai/projects
            </div>
        </div>

        <div className="flex rounded-lg bg-bg-primary">
            {/* Sidebar */}
            <div className="hidden w-40 shrink-0 border-r border-border-secondary bg-bg-secondary p-3 md:block">
                <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500">
                        <CheckSquare className="size-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-primary">Projects</p>
                        <p className="text-[10px] text-text-tertiary">Pro</p>
                    </div>
                </div>
                <p className="mb-1.5 text-[9px] font-medium uppercase text-text-quaternary">Projects</p>
                <div className="space-y-0.5">
                    {["Q1 Launch", "Website Redesign", "Mobile App", "API Integration", "Marketing"].map((item, i) => (
                        <div key={item} className={cx("rounded px-2 py-1 text-[10px]", i === 0 ? "bg-bg-primary font-medium text-text-primary" : "text-text-tertiary")}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">Q1 Launch</p>
                    <Badge color="brand" type="pill" size="sm">In Progress</Badge>
                </div>
                <div className="space-y-2">
                    {[
                        { task: "Finalize landing page copy", status: "done", assignee: "JD", priority: "high" },
                        { task: "Set up analytics tracking", status: "progress", assignee: "SK", priority: "medium" },
                        { task: "Configure email sequences", status: "todo", assignee: "MR", priority: "high" },
                        { task: "QA testing on staging", status: "todo", assignee: "AL", priority: "medium" },
                    ].map((item) => (
                        <div key={item.task} className="flex items-center gap-2 rounded-lg bg-bg-primary p-2 ring-1 ring-border-secondary">
                            <div className={cx(
                                "size-4 rounded border-2 flex items-center justify-center",
                                item.status === "done" ? "border-success-500 bg-success-500" : "border-border-primary"
                            )}>
                                {item.status === "done" && <CheckSquare className="size-3 text-white" />}
                            </div>
                            <span className={cx("flex-1 text-xs", item.status === "done" ? "text-text-tertiary line-through" : "text-text-primary")}>{item.task}</span>
                            <span className={cx(
                                "rounded px-1.5 py-0.5 text-[9px] font-medium",
                                item.priority === "high" ? "bg-error-100 text-error-700" : "bg-warning-100 text-warning-700"
                            )}>{item.priority}</span>
                            <div className="flex size-5 items-center justify-center rounded-full bg-bg-tertiary text-[8px] font-medium text-text-secondary">{item.assignee}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Feature mockups
const TasksMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Task List</h3>
            <Badge color="brand" type="pill" size="sm">12 tasks</Badge>
        </div>
        <div className="space-y-2">
            {[
                { task: "Design system audit", priority: "high", due: "Today", assignee: "Sarah K.", status: "progress" },
                { task: "API documentation", priority: "medium", due: "Tomorrow", assignee: "Mike R.", status: "todo" },
                { task: "User testing sessions", priority: "high", due: "Wed", assignee: "Alex L.", status: "todo" },
                { task: "Performance optimization", priority: "low", due: "Fri", assignee: "John D.", status: "todo" },
            ].map((item) => (
                <div key={item.task} className="flex items-center gap-3 rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className={cx(
                        "size-5 rounded border-2 flex items-center justify-center shrink-0",
                        item.status === "progress" ? "border-cyan-500 bg-cyan-500" : "border-border-primary"
                    )}>
                        {item.status === "progress" && <Clock className="size-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.task}</p>
                        <p className="text-xs text-text-tertiary">{item.assignee} · Due {item.due}</p>
                    </div>
                    <span className={cx(
                        "rounded px-2 py-0.5 text-xs font-medium shrink-0",
                        item.priority === "high" ? "bg-error-100 text-error-700" :
                        item.priority === "medium" ? "bg-warning-100 text-warning-700" : "bg-bg-tertiary text-text-tertiary"
                    )}>{item.priority}</span>
                </div>
            ))}
        </div>
    </div>
);

const KanbanMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Kanban Board</h3>
            <span className="text-xs text-text-tertiary">3 columns</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
            {[
                { name: "To Do", color: "bg-gray-400", tasks: ["Research competitors", "Draft proposal", "Setup CI/CD"] },
                { name: "In Progress", color: "bg-cyan-500", tasks: ["Build dashboard", "API integration"] },
                { name: "Done", color: "bg-success-500", tasks: ["Define requirements", "Create wireframes", "Tech spec"] },
            ].map((col) => (
                <div key={col.name} className="rounded-lg bg-bg-secondary p-2">
                    <div className="mb-2 flex items-center gap-2">
                        <div className={cx("size-2 rounded-full", col.color)} />
                        <span className="text-xs font-medium text-text-secondary">{col.name}</span>
                        <span className="text-xs text-text-quaternary">{col.tasks.length}</span>
                    </div>
                    <div className="space-y-1.5">
                        {col.tasks.map((task) => (
                            <div key={task} className="rounded bg-bg-primary p-2 text-xs text-text-primary shadow-sm ring-1 ring-border-secondary">
                                {task}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const WorkloadMockup = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Team Workload</h3>
            <Badge color="success" type="pill" size="sm">Balanced</Badge>
        </div>
        <div className="space-y-3">
            {[
                { name: "Sarah Kim", role: "Designer", tasks: 4, capacity: 60, avatar: "SK" },
                { name: "Mike Rodriguez", role: "Engineer", tasks: 6, capacity: 85, avatar: "MR" },
                { name: "Alex Lee", role: "PM", tasks: 3, capacity: 45, avatar: "AL" },
                { name: "John Davis", role: "Engineer", tasks: 5, capacity: 70, avatar: "JD" },
            ].map((person) => (
                <div key={person.name} className="flex items-center gap-3 rounded-lg bg-bg-primary p-3 ring-1 ring-border-secondary">
                    <div className="flex size-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-medium text-cyan-700">
                        {person.avatar}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-text-primary">{person.name}</p>
                            <span className="text-xs text-text-tertiary">{person.tasks} tasks</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-bg-tertiary">
                                <div
                                    className={cx(
                                        "h-1.5 rounded-full",
                                        person.capacity > 80 ? "bg-error-500" : person.capacity > 60 ? "bg-warning-500" : "bg-success-500"
                                    )}
                                    style={{ width: `${person.capacity}%` }}
                                />
                            </div>
                            <span className="text-xs text-text-tertiary">{person.capacity}%</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const features: ProductFeature[] = [
    {
        title: "Task Management",
        description: "Create tasks with priorities, due dates, and assignees. Track progress in real-time and never let anything fall through the cracks.",
        bullets: [
            "Create tasks with rich descriptions",
            "Set priorities and due dates",
            "Assign to team members",
            "Track progress with status updates",
        ],
        mockup: <TasksMockup />,
    },
    {
        title: "Kanban & Timeline Views",
        description: "Visualize your work the way you want. Drag-and-drop Kanban boards for agile teams, timeline views for project planning.",
        bullets: [
            "Drag-and-drop Kanban boards",
            "Timeline and Gantt views",
            "Milestone tracking",
            "Task dependencies",
        ],
        mockup: <KanbanMockup />,
        reverse: true,
    },
    {
        title: "AI Auto-Assignment",
        description: "Let AI analyze team workload and automatically assign tasks to the right people. Balance capacity and hit deadlines.",
        bullets: [
            "Smart workload balancing",
            "AI-powered task assignment",
            "Capacity planning",
            "Bottleneck detection",
        ],
        mockup: <WorkloadMockup />,
    },
];

const capabilities: ProductCapability[] = [
    { name: "Tasks", emoji: "✅", description: "Create & track" },
    { name: "Milestones", emoji: "🎯", description: "Key deadlines" },
    { name: "Kanban", emoji: "📋", description: "Board view" },
    { name: "Timeline", emoji: "📅", description: "Gantt charts" },
    { name: "Workload", emoji: "👥", description: "Team capacity" },
    { name: "Templates", emoji: "📄", description: "Reuse workflows" },
    { name: "Comments", emoji: "💬", description: "Collaborate" },
    { name: "Attachments", emoji: "📎", description: "Files & docs" },
];

export function ProjectsContent() {
    return (
        <ProductLanding
            productName="Projects"
            productColor="bg-cyan-500"
            badge="Work that tracks itself"
            headline="From idea to done, managed by AI"
            subheadline="Tasks, milestones, Kanban boards, and timeline views—all coordinated by agents that auto-assign, track progress, and keep everyone aligned."
            heroMockup={<ProjectsPreview />}
            features={features}
            capabilities={capabilities}
            ctaHeadline="Start shipping faster"
            ctaSubheadline="Create your first project and let AI help you manage the work. Free for 14 days."
        />
    );
}
