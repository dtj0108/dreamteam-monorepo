'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/base/buttons/button'
import { Badge } from '@/components/ui/badge'
import { BorderBeam } from '@/components/ui/border-beam'

// --- Agent scenario data ---

interface AgentStep {
  text: string
}

interface AgentScenario {
  name: string
  emoji: string
  steps: AgentStep[]
  output: string
}

const AGENTS: AgentScenario[] = [
  {
    name: 'Sales Agent',
    emoji: '🤝',
    steps: [
      { text: 'Scanning inbox for new leads' },
      { text: 'Found lead: sarah@acme.com' },
      { text: 'Scored: 87/100 — High priority' },
      { text: 'Drafting follow-up...' },
    ],
    output:
      'Hi Sarah, thanks for your interest in DreamTeam. Based on your team size, I\'d recommend our Growth plan with 5 agents...',
  },
  {
    name: 'Finance Agent',
    emoji: '💰',
    steps: [
      { text: 'Connected to Chase ••4829' },
      { text: 'Pulled 142 new transactions' },
      { text: 'Auto-categorized 97.2%' },
      { text: 'Flagging anomaly...' },
    ],
    output:
      'Unusual: $4,200 AWS charge — 3.2x above 90-day avg. Flagged for review.',
  },
  {
    name: 'Project Agent',
    emoji: '📋',
    steps: [
      { text: 'Scanned #product-updates' },
      { text: 'Found 3 action items' },
      { text: 'Created tasks in Website Redesign' },
      { text: 'Assigning...' },
    ],
    output:
      'Fix hero section → @drew (P1), Update docs → @mike (P2), Design review → @sarah (P3)',
  },
  {
    name: 'Support Agent',
    emoji: '🎧',
    steps: [
      { text: 'Monitoring Zendesk queue' },
      { text: 'New ticket #4821 — login issue' },
      { text: 'Matched KB article: SSO setup' },
      { text: 'Drafting response...' },
    ],
    output:
      'Hi Alex, this is a known issue with SSO tokens expiring. Go to Settings → Security → Refresh Token and click "Reset". That should fix it instantly.',
  },
  {
    name: 'HR Agent',
    emoji: '👥',
    steps: [
      { text: 'Reviewing 12 new applications' },
      { text: 'Screened against role requirements' },
      { text: 'Top 3 candidates shortlisted' },
      { text: 'Scheduling interviews...' },
    ],
    output:
      'Interview slots booked: Maria L. (Tue 2pm), James K. (Wed 10am), Priya S. (Thu 3pm). Calendar invites sent to hiring panel.',
  },
  {
    name: 'Marketing Agent',
    emoji: '📣',
    steps: [
      { text: 'Analyzing campaign performance' },
      { text: 'Email open rate: 34.2% (+8%)' },
      { text: 'Top segment: Enterprise CTOs' },
      { text: 'Generating report...' },
    ],
    output:
      'Q4 campaign outperformed by 22%. Recommend doubling budget on LinkedIn ads — CTO segment converts at 4.1x vs. 1.2x average.',
  },
]

// --- Timing constants ---
const STEP_INTERVAL = 800
const TYPE_SPEED = 20
const DONE_PAUSE = 3000
const RESET_DURATION = 500
const AGENT_STAGGER = 2000

// --- Agent card component ---

type Phase = 'stepping' | 'typing' | 'done' | 'resetting'

function AgentCard({
  agent,
  delay,
}: {
  agent: AgentScenario
  delay: number
}) {
  const [phase, setPhase] = useState<Phase>('stepping')
  const [visibleSteps, setVisibleSteps] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [started, setStarted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }, [])

  const runCycle = useCallback(() => {
    if (reducedMotion) {
      // Show everything immediately for reduced motion
      setVisibleSteps(agent.steps.length)
      setTypedText(agent.output)
      setPhase('done')
      return
    }

    setPhase('stepping')
    setVisibleSteps(0)
    setTypedText('')

    const completedSteps = agent.steps.length - 1

    // Reveal steps one by one
    for (let i = 0; i <= completedSteps; i++) {
      addTimer(() => {
        setVisibleSteps(i + 1)
        // After last step, start typing
        if (i === completedSteps) {
          setPhase('typing')
        }
      }, i * STEP_INTERVAL)
    }
  }, [agent, addTimer, reducedMotion])

  // Typewriter effect
  useEffect(() => {
    if (phase !== 'typing') return

    let charIndex = 0
    intervalRef.current = setInterval(() => {
      charIndex++
      if (charIndex <= agent.output.length) {
        setTypedText(agent.output.slice(0, charIndex))
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setPhase('done')
      }
    }, TYPE_SPEED)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [phase, agent.output])

  // Done → pause → reset → restart
  useEffect(() => {
    if (phase !== 'done' || reducedMotion) return

    const id = addTimer(() => {
      setPhase('resetting')
      addTimer(() => {
        runCycle()
      }, RESET_DURATION)
    }, DONE_PAUSE)

    return () => clearTimeout(id)
  }, [phase, addTimer, runCycle, reducedMotion])

  // Initial delay before starting
  useEffect(() => {
    const id = setTimeout(() => {
      setStarted(true)
      runCycle()
    }, delay)

    return () => {
      clearTimeout(id)
      clearAllTimers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completedStepCount = agent.steps.length - 1
  const isLastStep = (idx: number) => idx === completedStepCount

  return (
    <div className="h-[200px] rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 overflow-hidden">
      <motion.div
        className="flex flex-col gap-2 h-full"
        animate={{ opacity: phase === 'resetting' ? 0 : 1 }}
        transition={{ duration: phase === 'resetting' ? 0.4 : 0.3 }}
      >
        {/* Agent header */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg leading-none">{agent.emoji}</span>
          <span className="text-sm font-medium text-zinc-100">{agent.name}</span>
          <span className="ml-auto size-2 animate-pulse rounded-full bg-emerald-500" />
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {started &&
              Array.from({ length: visibleSteps }).map((_, idx) => (
                <motion.div
                  key={`${agent.name}-step-${idx}`}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  layout={false}
                  className="flex items-start gap-2 shrink-0"
                >
                  {isLastStep(idx) && phase !== 'done' && phase !== 'resetting' ? (
                    <Loader2Icon className="mt-0.5 size-3 shrink-0 animate-spin text-blue-400" />
                  ) : (
                    <CheckIcon className="mt-0.5 size-3 shrink-0 text-emerald-400" />
                  )}
                  <span
                    className={`text-xs leading-relaxed ${
                      isLastStep(idx) && phase !== 'done' && phase !== 'resetting'
                        ? 'text-zinc-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {agent.steps[idx].text}
                  </span>
                </motion.div>
              ))}
          </AnimatePresence>

          {/* Typewriter output */}
          <AnimatePresence>
            {typedText.length > 0 && (
              <motion.div
                key={`${agent.name}-output`}
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                layout={false}
                className="mt-1 rounded bg-zinc-800/50 px-2 py-1.5 shrink-0"
              >
                <p className="text-xs leading-relaxed text-zinc-300 italic">
                  &ldquo;{typedText}
                  {phase === 'typing' && (
                    <span className="inline-block w-[2px] h-3 ml-0.5 bg-zinc-300 align-middle animate-[cursor-blink_1s_steps(2)_infinite]" />
                  )}
                  {phase !== 'typing' && typedText.length > 0 && <>&rdquo;</>}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// --- Main hero section ---

const HeroSection = () => {
  return (
    <section className="flex-1 overflow-hidden py-8 sm:py-16 lg:py-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 sm:px-6 lg:px-8">
        {/* Conical flow: narrow top → wide bottom */}

        {/* 1. Badge — smallest element */}
        <Badge variant="outline" className="text-sm font-normal">
          Introducing AI Agents
        </Badge>

        {/* 2. Heading — slightly wider */}
        <h1 className="mt-5 max-w-md text-center text-2xl font-semibold sm:mt-6 sm:max-w-2xl sm:text-3xl lg:mt-8 lg:max-w-4xl lg:text-5xl lg:font-bold lg:leading-[1.3]">
          Add AI Agents that work
          <br />
          autonomously <span className="underline underline-offset-3">in minutes</span>
        </h1>

        {/* 3. Subtitle — wider still */}
        <p className="text-muted-foreground mt-4 max-w-sm text-center text-lg sm:max-w-xl sm:text-xl lg:mt-6 lg:max-w-2xl">
          Set them up once, they work forever.
          <br />
          While you do, whatever.
        </p>

        {/* 4. CTA buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:mt-8 lg:mt-10">
          <Button href="/demo" color="secondary" size="xl" className="hidden sm:inline-flex">
            Explore Workspace
          </Button>
          <Button href="/pricing" size="xl" className="bg-blue-600 hover:bg-blue-700">
            Deploy Agents
          </Button>
        </div>

        {/* 5. Agent preview — widest, full bleed */}
        <div
          className="relative mt-10 w-full max-w-6xl sm:mt-16 md:[transform:perspective(2000px)_rotateX(4deg)] md:hover:[transform:perspective(2000px)_rotateX(0deg)] md:transition-transform md:duration-700"
        >
          <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            <BorderBeam
              colorFrom="#3b82f6"
              colorTo="#10b981"
              duration={8}
              size={80}
            />

            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-300">6 agents working</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                <Badge
                  variant="outline"
                  className="border-red-500/30 bg-red-500/10 text-red-400 text-xs px-1.5 py-0"
                >
                  LIVE
                </Badge>
              </div>
            </div>

            {/* Agent cards */}
            <div className="p-3 sm:p-4">
              {/* Desktop: all 6 agents in 3-col grid */}
              <div className="hidden lg:grid lg:grid-cols-3 lg:gap-3">
                {AGENTS.map((agent, idx) => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    delay={idx * AGENT_STAGGER}
                  />
                ))}
              </div>

              {/* Tablet: 4 agents in 2-col grid */}
              <div className="hidden md:grid md:grid-cols-2 md:gap-3 lg:hidden">
                {AGENTS.slice(0, 4).map((agent, idx) => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    delay={idx * AGENT_STAGGER}
                  />
                ))}
              </div>

              {/* Mobile: 2 agents stacked */}
              <div className="flex flex-col gap-3 md:hidden">
                {AGENTS.slice(0, 2).map((agent, idx) => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    delay={idx * AGENT_STAGGER}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cursor blink keyframe */}
      <style jsx global>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  )
}

export default HeroSection
