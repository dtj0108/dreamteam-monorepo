'use client'

import { useRef } from 'react'

import Link from 'next/link'
import { BotIcon, MessageSquareIcon, UsersIcon, RocketIcon, PlayIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import NotificationStack from '@/components/shadcn-studio/blocks/features-section-14/notification-stack'
import type { NotificationCard } from '@/components/shadcn-studio/blocks/features-section-14/notification-stack'

import { MotionPreset } from '@/components/ui/motion-preset'
import { Cursor, CursorFollow, CursorProvider } from '@/components/ui/cursor'
import { AnimatedBeam } from '@/components/ui/animated-beam'

import { cn } from '@/lib/utils'

import DreamTeamLogo from '@/assets/svg/dream-team-logo'

type AgentAvatar = {
  emoji: string
  fallback: string
  name: string
  size: string
}

type DepartmentBadge = {
  name: string
  emoji: string
  color: string
}

interface AgentFeaturesProps {
  notifications: NotificationCard[]
  avatarData: AgentAvatar[]
  departments?: DepartmentBadge[]
  agentCount?: number
}

const defaultDepartments: DepartmentBadge[] = [
  { name: 'Leadership', emoji: '👔', color: '#8B5CF6' },
  { name: 'Sales', emoji: '💼', color: '#22C55E' },
  { name: 'Finance', emoji: '💵', color: '#F59E0B' },
  { name: 'Marketing', emoji: '✨', color: '#EC4899' },
  { name: 'Systems', emoji: '⚙️', color: '#06B6D4' },
  { name: 'Operations', emoji: '📊', color: '#10B981' },
]

const defaultNotifications: NotificationCard[] = [
  {
    id: '1',
    name: 'Sales Agent',
    time: 'Just now',
    message: 'Deal created',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png',
    fallback: 'SA'
  },
  {
    id: '2',
    name: 'Finance Agent',
    time: '2 min ago',
    message: 'Forecast updated',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    fallback: 'FA'
  },
  {
    id: '3',
    name: 'Project Agent',
    time: '5 min ago',
    message: 'Tasks assigned',
    avatar: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    fallback: 'PA'
  }
]

const defaultAvatarData: AgentAvatar[] = [
  { emoji: '🤝', fallback: 'SA', name: 'Sales Agent', size: 'size-12' },
  { emoji: '💵', fallback: 'FA', name: 'Finance Agent', size: 'size-16' },
  { emoji: '📋', fallback: 'PA', name: 'Project Agent', size: 'size-20' },
  { emoji: '📚', fallback: 'KA', name: 'Knowledge Agent', size: 'size-16' },
  { emoji: '💰', fallback: 'BA', name: 'Budget Agent', size: 'size-12' }
]

const AgentFeatures = ({
  notifications = defaultNotifications,
  avatarData = defaultAvatarData,
  departments = defaultDepartments,
  agentCount = 38
}: Partial<AgentFeaturesProps>) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const div1Ref = useRef<HTMLDivElement>(null)
  const div2Ref = useRef<HTMLDivElement>(null)
  const div3Ref = useRef<HTMLDivElement>(null)
  const div4Ref = useRef<HTMLDivElement>(null)
  const div5Ref = useRef<HTMLDivElement>(null)
  const div6Ref = useRef<HTMLDivElement>(null)
  const div7Ref = useRef<HTMLDivElement>(null)
  const div8Ref = useRef<HTMLDivElement>(null)
  const div9Ref = useRef<HTMLDivElement>(null)
  const div10Ref = useRef<HTMLDivElement>(null)
  const span1Ref = useRef<HTMLSpanElement>(null)
  const span2Ref = useRef<HTMLSpanElement>(null)
  const span3Ref = useRef<HTMLSpanElement>(null)
  const span4Ref = useRef<HTMLSpanElement>(null)
  const span5Ref = useRef<HTMLSpanElement>(null)
  const span6Ref = useRef<HTMLSpanElement>(null)
  const span7Ref = useRef<HTMLSpanElement>(null)
  const span8Ref = useRef<HTMLSpanElement>(null)
  const span9Ref = useRef<HTMLSpanElement>(null)
  const span10Ref = useRef<HTMLSpanElement>(null)
  const span11Ref = useRef<HTMLSpanElement>(null)

  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Card container */}
        <div className='rounded-3xl bg-muted/50 p-6 sm:p-10 lg:p-16'>
        {/* Header */}
        <div className='mb-12 space-y-4 text-center sm:mb-16 lg:mb-24'>
          <MotionPreset fade blur slide={{ direction: 'up', offset: 50 }} transition={{ duration: 0.5 }}>
            <Badge className='text-sm font-normal' variant='outline'>
              AI Agents
            </Badge>
          </MotionPreset>
          <MotionPreset
            component='h2'
            className='text-2xl font-semibold md:text-3xl lg:text-4xl'
            fade
            blur
            slide={{ direction: 'up', offset: 50 }}
            delay={0.3}
            transition={{ duration: 0.5 }}
          >
            You built this business to have freedom.<br /><em className='underline'>Now actually take it.</em>
          </MotionPreset>
          <MotionPreset
            component='p'
            className='text-muted-foreground text-xl'
            fade
            blur
            slide={{ direction: 'up', offset: 50 }}
            delay={0.5}
            transition={{ duration: 0.5 }}
          >
            That's the power of unified intelligence. Agents share context and coordinate automatically.
          </MotionPreset>
          <MotionPreset
            fade
            blur
            slide={{ direction: 'up', offset: 50 }}
            delay={0.7}
            transition={{ duration: 0.5 }}
            className='flex items-center justify-center gap-3 pt-2'
          >
            <Button asChild size='lg'>
              <Link href='/pricing'>
                <RocketIcon className='mr-2 size-4' />
                Deploy Agents
              </Link>
            </Button>
            <Button asChild variant='outline' size='lg'>
              <Link href='/demo'>
                <PlayIcon className='mr-2 size-4' />
                Demo Workspace
              </Link>
            </Button>
          </MotionPreset>
        </div>

        <div ref={containerRef} className='relative flex w-full flex-col items-center gap-6 lg:gap-10'>
          {/* Beam visualization */}
          <div className='relative flex w-full items-center justify-between px-2 sm:px-4 lg:px-0'>
            {/* Left department badges */}
            <div className='relative z-10 flex flex-col gap-2 sm:gap-3 lg:gap-10'>
              {/* Ref on outer div, MotionPreset wraps content */}
              <div ref={div2Ref}>
                <MotionPreset
                  fade
                  blur
                  delay={0.05}
                  transition={{ duration: 0.5 }}
                  className='bg-background flex h-8 sm:h-10 lg:h-11 w-fit items-center gap-1.5 sm:gap-2 rounded-md border px-2 sm:px-3 text-xs sm:text-sm lg:text-lg shadow-sm'
                >
                  <span
                    className='flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-md text-xs sm:text-sm lg:text-base'
                    style={{ backgroundColor: `${departments[0]?.color}20` }}
                  >
                    {departments[0]?.emoji}
                  </span>
                  {departments[0]?.name}
                </MotionPreset>
              </div>
              <div ref={div3Ref}>
                <MotionPreset
                  fade
                  blur
                  delay={0.05}
                  transition={{ duration: 0.5 }}
                  className='bg-background flex h-8 sm:h-10 lg:h-11 w-fit items-center gap-1.5 sm:gap-2 rounded-md border px-2 sm:px-3 text-xs sm:text-sm lg:text-lg shadow-sm'
                >
                  <span
                    className='flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-md text-xs sm:text-sm lg:text-base'
                    style={{ backgroundColor: `${departments[1]?.color}20` }}
                  >
                    {departments[1]?.emoji}
                  </span>
                  {departments[1]?.name}
                </MotionPreset>
              </div>
              <div ref={div9Ref}>
                <MotionPreset
                  fade
                  blur
                  delay={0.05}
                  transition={{ duration: 0.5 }}
                  className='bg-background flex h-8 sm:h-10 lg:h-11 w-fit items-center gap-1.5 sm:gap-2 rounded-md border px-2 sm:px-3 text-xs sm:text-sm lg:text-lg shadow-sm'
                >
                  <span
                    className='flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-md text-xs sm:text-sm lg:text-base'
                    style={{ backgroundColor: `${departments[2]?.color}20` }}
                  >
                    {departments[2]?.emoji}
                  </span>
                  {departments[2]?.name}
                </MotionPreset>
              </div>
            </div>

            {/* Left span anchors for beams */}
            <div className='flex flex-col gap-3 sm:gap-5 lg:gap-8'>
              <span ref={span1Ref} className='size-0.5' />
              <span ref={span2Ref} className='size-0.5' />
              <span ref={span3Ref} className='size-0.5' />
              <span ref={span10Ref} className='size-0.5' />
            </div>

            {/* Central hub */}
            <div ref={div1Ref} className='relative z-10'>
              <MotionPreset
                fade
                blur
                delay={0.05}
                transition={{ duration: 0.5 }}
                className='bg-primary animate-heartbeat z-1 flex h-10 sm:h-12 lg:h-14.5 w-fit items-center gap-2 sm:gap-3 lg:gap-4 rounded-full px-2.5 sm:px-3 lg:px-3.5 text-sm sm:text-lg lg:text-2xl font-medium text-white shadow-2xl [--heartbeat-color:var(--primary)] dark:text-black'
              >
                <div className='bg-primary flex size-6 sm:size-8 lg:size-10 items-center justify-center rounded-full border-2 border-white dark:border-black'>
                  <DreamTeamLogo className='size-4 sm:size-5 lg:size-6 text-white dark:text-black' />
                </div>
                <span className='hidden sm:inline'>Your Agents</span>
                <span className='sm:hidden'>Agents</span>
              </MotionPreset>
            </div>

            {/* Right span anchors for beams */}
            <div className='flex flex-col gap-3 sm:gap-5 lg:gap-8'>
              <span ref={span4Ref} className='size-0.5' />
              <span ref={span5Ref} className='size-0.5' />
              <span ref={span6Ref} className='size-0.5' />
              <span ref={span11Ref} className='size-0.5' />
            </div>

            {/* Right department badges */}
            <div className='relative z-10 flex flex-col gap-2 sm:gap-3 lg:gap-10'>
              <div ref={div4Ref}>
                <MotionPreset
                  fade
                  blur
                  delay={0.05}
                  transition={{ duration: 0.5 }}
                  className='bg-background flex h-8 sm:h-10 lg:h-11 w-fit items-center gap-1.5 sm:gap-2 rounded-md border px-2 sm:px-3 text-xs sm:text-sm lg:text-lg shadow-sm'
                >
                  <span
                    className='flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-md text-xs sm:text-sm lg:text-base'
                    style={{ backgroundColor: `${departments[3]?.color}20` }}
                  >
                    {departments[3]?.emoji}
                  </span>
                  {departments[3]?.name}
                </MotionPreset>
              </div>

              <div ref={div5Ref}>
                <MotionPreset
                  fade
                  blur
                  delay={0.05}
                  transition={{ duration: 0.5 }}
                  className='bg-background flex h-8 sm:h-10 lg:h-11 w-fit items-center gap-1.5 sm:gap-2 rounded-md border px-2 sm:px-3 text-xs sm:text-sm lg:text-lg shadow-sm'
                >
                  <span
                    className='flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-md text-xs sm:text-sm lg:text-base'
                    style={{ backgroundColor: `${departments[4]?.color}20` }}
                  >
                    {departments[4]?.emoji}
                  </span>
                  {departments[4]?.name}
                </MotionPreset>
              </div>

              <div ref={div10Ref}>
                <MotionPreset
                  fade
                  blur
                  delay={0.05}
                  transition={{ duration: 0.5 }}
                  className='bg-background flex h-8 sm:h-10 lg:h-11 w-fit items-center gap-1.5 sm:gap-2 rounded-md border px-2 sm:px-3 text-xs sm:text-sm lg:text-lg shadow-sm'
                >
                  <span
                    className='flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-md text-xs sm:text-sm lg:text-base'
                    style={{ backgroundColor: `${departments[5]?.color}20` }}
                  >
                    {departments[5]?.emoji}
                  </span>
                  {departments[5]?.name}
                </MotionPreset>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className='relative z-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
            {/* Card 1: Specialized Agents */}
            <MotionPreset
              fade
              blur
              delay={0.1}
              transition={{ duration: 0.9 }}
              className='relative flex flex-col items-center gap-4 lg:gap-18'
            >
              <span ref={span7Ref} className='size-0.5 max-lg:hidden' />
              <div ref={div6Ref} className='bg-card h-full flex flex-col overflow-hidden rounded-xl border'>
                <div className='flex-1 px-6 pt-6 text-center'>
                  <div className='flex items-center justify-center gap-1.5 text-lg font-medium'>
                    <BotIcon className='size-4.5 shrink-0' />
                    {agentCount} Specialized Agents
                  </div>
                  <p className='text-muted-foreground mt-1.5'>
                    Expert AI agents across Leadership, Sales, Marketing, Finance, and more.
                  </p>
                </div>
                <div className='relative mt-2.5 sm:pl-6'>
                  <div className='flex h-63 w-full items-center justify-center bg-violet-600/10 sm:rounded-tl-md'>
                    <div className='grid grid-cols-5 gap-2.5 p-4'>
                      {['👔', '🎯', '💼', '🚀', '✨', '🧪', '💵', '⚙️', '👥', '🎓', '📊', '🤖', '📈', '🔧', '💡', '🎨', '📱', '🔒', '📣', '🌐'].map((emoji, i) => (
                        <div
                          key={i}
                          className='flex size-10 items-center justify-center rounded-full bg-white/80 text-lg shadow-sm transition-transform hover:scale-110'
                        >
                          {emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </MotionPreset>

            {/* Card 2: Real-time Communication */}
            <MotionPreset
              fade
              blur
              delay={0.12}
              transition={{ duration: 0.9 }}
              className='relative flex flex-col items-center gap-4 lg:gap-18'
            >
              <span ref={span8Ref} className='size-0.5 max-lg:hidden' />
              <div ref={div7Ref} className='bg-card h-full flex flex-col overflow-hidden rounded-xl border'>
                <div className='flex-1 px-6 pt-6 text-center'>
                  <div className='flex items-center justify-center gap-1.5 text-lg font-medium'>
                    <MessageSquareIcon className='size-4.5 shrink-0' />
                    Real-time Communication
                  </div>
                  <p className='text-muted-foreground mt-1.5'>
                    Agents collaborate and communicate across departments in real-time.
                  </p>
                </div>
                <div className='mt-2.5 sm:pl-6'>
                  <div className='flex h-63 w-full flex-col justify-center bg-sky-600/10 px-4 sm:rounded-tl-md dark:bg-sky-400/40'>
                    <NotificationStack notifications={notifications} />
                  </div>
                </div>
              </div>
            </MotionPreset>

            {/* Card 3: Cross-Team Collaboration */}
            <MotionPreset
              fade
              blur
              delay={0.15}
              transition={{ duration: 0.9 }}
              className='relative flex flex-col items-center gap-4 lg:gap-18'
            >
              <span ref={span9Ref} className='size-0.5 max-lg:hidden' />
              <div ref={div8Ref} className='bg-card h-full flex flex-col overflow-hidden rounded-xl border'>
                <div className='flex-1 px-6 pt-6 text-center'>
                  <div className='flex items-center justify-center gap-1.5 text-lg font-medium'>
                    <UsersIcon className='size-4.5 shrink-0' />
                    Cross-Team Collaboration
                  </div>
                  <p className='text-muted-foreground mt-1.5'>
                    Your agents work together seamlessly, sharing insights and coordinating tasks.
                  </p>
                </div>
                <div className='relative mt-2.5 sm:pl-6'>
                  <div className='flex h-63 w-full items-center justify-center bg-green-600/10 sm:rounded-tl-md dark:bg-green-400/40'>
                    <div className='flex min-h-20 flex-1 items-center justify-center -space-x-4'>
                      {avatarData.map(item => (
                        <div key={item.name}>
                          <Avatar className={cn('ring-ring ring-2', item.size)}>
                            <AvatarFallback className='bg-gray-100 text-lg'>
                              {item.emoji}
                            </AvatarFallback>
                          </Avatar>
                          <CursorProvider>
                            <Cursor>
                              <svg
                                className='size-6 text-sky-600 dark:text-sky-400'
                                xmlns='http://www.w3.org/2000/svg'
                                viewBox='0 0 40 40'
                              >
                                <path
                                  fill='currentColor'
                                  d='M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z'
                                />
                              </svg>
                            </Cursor>
                            <CursorFollow>
                              <div className='w-fit rounded-lg bg-sky-600 px-2 py-1 text-sm text-nowrap text-white shadow-lg dark:bg-sky-400'>
                                {item.name}
                              </div>
                            </CursorFollow>
                          </CursorProvider>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </MotionPreset>
          </div>

          {/* Animated beams - Top connections (hub to department badges) */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div1Ref}
            toRef={span2Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
            reverse
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div1Ref}
            toRef={span5Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span2Ref}
            toRef={span1Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
            reverse
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span1Ref}
            toRef={div2Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
            reverse
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span2Ref}
            toRef={span3Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
            reverse
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span3Ref}
            toRef={div3Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
            reverse
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span5Ref}
            toRef={span4Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span4Ref}
            toRef={div4Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span5Ref}
            toRef={span6Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span6Ref}
            toRef={div5Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
          />

          {/* Additional beams for third badges */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span3Ref}
            toRef={span10Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
            reverse
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span10Ref}
            toRef={div9Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
            reverse
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span6Ref}
            toRef={span11Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span11Ref}
            toRef={div10Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0'
          />

          {/* Animated beams - Bottom connections (hub to feature cards) - hidden on mobile due to scaling */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div1Ref}
            toRef={span8Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-lg:hidden'
            startXOffset={5}
            startYOffset={20}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span8Ref}
            toRef={span7Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            reverse
            className='z-0 max-lg:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span8Ref}
            toRef={span9Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-lg:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span8Ref}
            toRef={div7Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-lg:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span7Ref}
            toRef={div6Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            reverse
            className='z-0 max-lg:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={span9Ref}
            toRef={div8Ref}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-lg:hidden'
          />
        </div>
        </div>
      </div>
    </section>
  )
}

export default AgentFeatures
