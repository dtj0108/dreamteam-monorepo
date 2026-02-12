import Link from 'next/link'

const featureData = [
  {
    title: 'They remember everything',
    highlight: 'Persistent Memory',
    description: 'Your preferences, past decisions, and project context—agents learn from every interaction and never forget.',
    mockup: (
      <div className='w-full rounded-xl border border-white/10 bg-white/5 p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <span className='text-sm font-semibold text-white'>Agent Memory</span>
          <span className='rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400'>42 stored</span>
        </div>
        <div className='space-y-2'>
          {[
            { label: 'Drew prefers Slack over email', time: '2 days ago', icon: '🧠' },
            { label: 'TechCorp uses Net-30 terms', time: '5 days ago', icon: '💼' },
            { label: 'Monthly reports due on 1st', time: '1 week ago', icon: '📊' },
          ].map((m) => (
            <div key={m.label} className='flex items-start gap-2.5 rounded-lg bg-white/5 px-3 py-2'>
              <span className='mt-0.5 text-sm'>{m.icon}</span>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium text-gray-200'>{m.label}</p>
                <p className='text-[10px] text-gray-500'>{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className='mt-3 flex items-center gap-1.5 text-[10px] text-gray-500'>
          <div className='size-1.5 rounded-full bg-blue-400 animate-pulse' />
          Continuously learning from interactions...
        </div>
      </div>
    ),
  },
  {
    title: 'Teach them new skills',
    highlight: 'Custom Abilities',
    description: 'Write instructions in plain English. Agents learn new workflows instantly and use them forever.',
    mockup: (
      <div className='w-full rounded-xl border border-white/10 bg-white/5 p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <span className='text-sm font-semibold text-white'>Skills</span>
          <button className='rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white'>+ New Skill</button>
        </div>
        <div className='space-y-2'>
          {[
            { name: 'Project Planner', status: 'Active', color: 'bg-blue-500' },
            { name: 'Lead Qualifier', status: 'Active', color: 'bg-blue-500' },
            { name: 'Weekly Reporter', status: 'Draft', color: 'bg-gray-500' },
          ].map((s) => (
            <div key={s.name} className='flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5'>
              <div className='flex items-center gap-2'>
                <span className='text-sm'>✨</span>
                <span className='text-xs font-medium text-gray-200'>{s.name}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <div className={`size-1.5 rounded-full ${s.color}`} />
                <span className='text-[10px] text-gray-500'>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div className='mt-3 rounded-lg border border-dashed border-white/10 bg-white/5 p-3'>
          <p className='text-[10px] font-medium text-gray-500 mb-1'>Preview: Project Planner</p>
          <div className='font-mono text-[10px] text-gray-500 space-y-0.5'>
            <p className='text-blue-400'># When creating projects:</p>
            <p>1. Break into milestones</p>
            <p>2. Auto-assign by workload</p>
            <p>3. Create documentation</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Tools built in',
    highlight: 'Ready to Work',
    description: 'Transactions, projects, leads, knowledge base, web search, and more. Agents chain actions together autonomously.',
    mockup: (
      <div className='w-full rounded-xl border border-white/10 bg-white/5 p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <span className='text-sm font-semibold text-white'>Agent Tools</span>
          <span className='text-[10px] text-gray-500'>16 available</span>
        </div>
        <div className='grid grid-cols-4 gap-2'>
          {[
            { emoji: '💰', label: 'Transactions' },
            { emoji: '📋', label: 'Projects' },
            { emoji: '🤝', label: 'Leads' },
            { emoji: '📚', label: 'Knowledge' },
            { emoji: '🌐', label: 'Web Search' },
            { emoji: '📧', label: 'Email' },
            { emoji: '📊', label: 'Reports' },
            { emoji: '📁', label: 'Export' },
          ].map((t) => (
            <div key={t.label} className='flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2'>
              <span className='text-lg'>{t.emoji}</span>
              <span className='text-[9px] text-gray-500'>{t.label}</span>
            </div>
          ))}
        </div>
        <div className='mt-3 rounded-lg bg-white/5 border border-white/10 p-3'>
          <p className='text-[10px] text-gray-500 mb-1.5'>Action chain (3 tools)</p>
          <div className='flex items-center gap-1.5 text-[10px]'>
            <span className='rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400'>🤝 Score Lead</span>
            <span className='text-gray-600'>→</span>
            <span className='rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400'>📧 Send Email</span>
            <span className='text-gray-600'>→</span>
            <span className='rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400'>📋 Create Task</span>
          </div>
        </div>
      </div>
    ),
  },
]

const Features = () => {
  return (
    <section className='overflow-hidden py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-12 space-y-4 text-center sm:mb-16 lg:mb-24'>
          <div className='text-primary text-sm font-medium uppercase'>What Makes Us Different</div>
          <h2 className='text-2xl font-semibold md:text-3xl lg:text-4xl'>
            Your Agents Work Nights, Weekends, and Holidays. No Overtime Pay.
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>
            Agents with memory, skills, and tools—working alongside you in a human-friendly workspace.
          </p>
        </div>

        {/* Feature rows */}
        <div className='flex flex-col gap-8'>
          {featureData.map((item, i) => {
            const reversed = i % 2 === 1
            return (
              <div
                key={item.title}
                className='rounded-3xl bg-gray-950 p-6 sm:p-10 lg:p-14'
              >
                <div className={`flex flex-col items-stretch gap-8 lg:gap-0 ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
                  {/* Mockup side */}
                  <div className='flex flex-1 items-center lg:px-8'>
                    {item.mockup}
                  </div>

                  {/* Text side */}
                  <div className={`flex flex-1 flex-col justify-center lg:items-start lg:text-left items-center text-center lg:px-8`}>
                    <p className='text-sm font-semibold uppercase tracking-wider text-blue-400'>
                      {item.highlight}
                    </p>
                    <h3 className='mt-3 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl'>
                      {item.title}
                    </h3>
                    <p className='mt-4 max-w-md text-base text-gray-400 sm:text-lg'>
                      {item.description}
                    </p>
                    <Link
                      href='/pricing'
                      className='mt-6 inline-flex items-center justify-center rounded-full border-2 border-white/20 px-6 py-2.5 text-sm font-semibold text-white uppercase tracking-wider transition-colors hover:bg-white hover:text-gray-900'
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Features
