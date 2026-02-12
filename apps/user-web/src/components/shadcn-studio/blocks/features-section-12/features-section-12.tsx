'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { CardDescription, CardTitle } from '@/components/ui/card'

const agentResponses = [
  {
    emoji: '🤝',
    name: 'Sales Agent',
    message: 'Closed 3 deals worth $47,200. Sent 42 follow-up emails and booked 8 demos for next week.',
    color: 'bg-gray-200',
  },
  {
    emoji: '💵',
    name: 'Finance Agent',
    message: 'Categorized 127 transactions. Flagged 2 unusual charges and updated the monthly cash flow forecast.',
    color: 'bg-gray-200',
  },
  {
    emoji: '📋',
    name: 'Project Agent',
    message: 'Created 3 new projects, assigned 24 tasks across the team, and closed 18 completed items.',
    color: 'bg-gray-200',
  },
  {
    emoji: '📚',
    name: 'Knowledge Agent',
    message: 'Updated 6 SOPs, created onboarding docs for 2 new clients, and answered 31 team questions.',
    color: 'bg-gray-200',
  },
  {
    emoji: '📊',
    name: 'Operations Agent',
    message: 'Optimized 3 workflows, reduced avg response time by 22%, and generated the weekly performance report.',
    color: 'bg-gray-200',
  },
]

const Features = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (!isInView) return

    let timers: NodeJS.Timeout[] = []

    const runCycle = () => {
      setVisibleCount(0)
      timers.push(setTimeout(() => setVisibleCount(1), 300))

      agentResponses.forEach((_, i) => {
        timers.push(
          setTimeout(() => setVisibleCount(i + 2), 800 + i * 600)
        )
      })

      const cycleLength = 800 + agentResponses.length * 600 + 3000
      timers.push(setTimeout(runCycle, cycleLength))
    }

    runCycle()

    return () => timers.forEach(clearTimeout)
  }, [isInView])

  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100 px-6 py-16 md:px-12 md:py-24'>
          <div className='relative z-10'>
            {/* Header */}
            <div className='mx-auto mb-12 text-center sm:mb-16 lg:mb-24'>
              <h2 className='text-2xl font-semibold text-gray-900 md:text-3xl lg:text-4xl'>
                Agents that do the work of entire teams — easy to train.
              </h2>
            </div>

            <div className='mx-auto max-w-2xl' ref={ref}>
              <div className='rounded-2xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6'>
                {/* Chat window chrome */}
                <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
                  <div className='flex gap-1.5'>
                    <div className='size-2.5 rounded-full bg-red-400' />
                    <div className='size-2.5 rounded-full bg-yellow-400' />
                    <div className='size-2.5 rounded-full bg-green-400' />
                  </div>
                  <span className='ml-2 text-xs text-gray-500'>DreamTeam Agents</span>
                  <div className='ml-auto flex items-center gap-1'>
                    <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
                    <span className='text-[10px] text-emerald-600'>5 agents online</span>
                  </div>
                </div>

                {/* Chat messages */}
                <div className='flex flex-col gap-3 h-[420px] overflow-hidden'>
                  {/* User message */}
                  <div
                    className='flex justify-end transition-all duration-500'
                    style={{
                      opacity: visibleCount >= 1 ? 1 : 0,
                      transform: visibleCount >= 1 ? 'translateY(0)' : 'translateY(10px)',
                    }}
                  >
                    <div className='max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5'>
                      <p className='text-sm text-white'>What did you get done this week?</p>
                    </div>
                  </div>

                  {/* Agent responses */}
                  {agentResponses.map((agent, i) => (
                    <div
                      key={agent.name}
                      className='flex gap-2.5 transition-all duration-500'
                      style={{
                        opacity: visibleCount >= i + 2 ? 1 : 0,
                        transform: visibleCount >= i + 2 ? 'translateY(0)' : 'translateY(10px)',
                      }}
                    >
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${agent.color}`}>
                        <span className='text-sm'>{agent.emoji}</span>
                      </div>
                      <div className='flex-1'>
                        <div className='rounded-2xl rounded-tl-md bg-gray-50 px-4 py-2.5'>
                          <p className='mb-1 text-xs font-semibold text-gray-900'>{agent.name}</p>
                          <p className='text-sm text-gray-600'>{agent.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {visibleCount > 0 && visibleCount < agentResponses.length + 2 && (
                    <div className='flex gap-2.5'>
                      <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100'>
                        <span className='text-sm'>{agentResponses[Math.min(visibleCount - 1, agentResponses.length - 1)]?.emoji}</span>
                      </div>
                      <div className='rounded-2xl rounded-tl-md bg-gray-50 px-4 py-3'>
                        <div className='flex items-center gap-1'>
                          <div className='size-1.5 animate-bounce rounded-full bg-gray-400' style={{ animationDelay: '0ms' }} />
                          <div className='size-1.5 animate-bounce rounded-full bg-gray-400' style={{ animationDelay: '150ms' }} />
                          <div className='size-1.5 animate-bounce rounded-full bg-gray-400' style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom text */}
            <div className='mx-auto mt-8 max-w-lg space-y-2 text-center'>
              <CardTitle className='text-xl font-semibold text-gray-900'>Autonomous Execution</CardTitle>
              <CardDescription className='mx-auto max-w-lg text-base text-gray-600'>
                One command triggers a cascade of coordinated actions across multiple specialists.
                Agents handle the busywork so you can focus on strategy.
              </CardDescription>
            </div>

            {/* CTA */}
            <div className='mt-10 flex justify-center'>
              <a
                href='/pricing'
                className='inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700'
              >
                Deploy Your Agents
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
