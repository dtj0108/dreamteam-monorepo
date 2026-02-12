'use client'

import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnimatedTooltip } from '@/components/ui/motion-tooltip'
import { BorderBeam } from '@/components/ui/border-beam'
import { Rating } from '@/components/ui/rating'
import { Button } from '@/components/base/buttons/button'

import LeadQualifier from '@/components/shadcn-studio/blocks/hero-section-40/lead-qualifier'
import MeetingPrep from '@/components/shadcn-studio/blocks/hero-section-40/meeting-prep'
import FollowUps from '@/components/shadcn-studio/blocks/hero-section-40/follow-ups'
import DataSync from '@/components/shadcn-studio/blocks/hero-section-40/data-sync'
import Reporting from '@/components/shadcn-studio/blocks/hero-section-40/reporting'
import ContentDrafting from '@/components/shadcn-studio/blocks/hero-section-40/content-drafting'

const avatars = [
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-45.png',
    fallback: 'AH',
    name: 'Ali Hussein',
    designation: 'Developer'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-59.png',
    fallback: 'SJ',
    name: 'Sahaj Jain',
    designation: 'Software Engineer'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-34.png',
    fallback: 'CD',
    name: 'Chánh Đại',
    designation: 'Design Engineer'
  },
  {
    image: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-58.png',
    fallback: 'J',
    name: 'Julian',
    designation: 'Senior Developer'
  }
]

const tabs = [
  {
    name: 'Sales Agents',
    value: 'lead-qualifier',
    content: <LeadQualifier />
  },
  {
    name: 'Leadership Agents',
    value: 'meeting-prep',
    content: <MeetingPrep />
  },
  {
    name: 'Marketing Agents',
    value: 'follow-ups',
    content: <FollowUps />
  },
  {
    name: 'Systems Agents',
    value: 'data-sync',
    content: <DataSync />
  },
  {
    name: 'Finance Agents',
    value: 'reporting',
    content: <Reporting />
  },
  {
    name: 'Operations Agents',
    value: 'content-drafting',
    content: <ContentDrafting />
  }
]

const HeroSection = () => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value || 'lead-qualifier')

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(currentTab => {
        const currentIndex = tabs.findIndex(tab => tab.value === currentTab)
        const nextIndex = (currentIndex + 1) % tabs.length

        return tabs[nextIndex].value
      })
    }, 7000)

    return () => clearInterval(interval)
  }, [activeTab])

  return (
    <section className='relative flex flex-col overflow-hidden'>
      <div className='border-b px-4 sm:px-6 lg:px-8'>
        <div className='mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-24'>
          <div className='flex flex-col items-center gap-4 text-center'>
            <Badge variant='outline' className='bg-muted relative gap-2 px-1.5 py-2.5'>
              <span className='bg-primary text-primary-foreground flex items-center rounded-full px-2.5 py-0.5 text-sm'>
                🔥 New
              </span>
              <span className='text-muted-foreground pr-1.5 text-sm font-normal'>Introducing AI Agents</span>
              <BorderBeam colorFrom='var(--primary)' colorTo='var(--primary)' size={35} />
            </Badge>

            <h1 className='text-2xl font-semibold sm:text-3xl lg:text-5xl lg:leading-[1.29167]'>
              Work with AI agents
              <br />
              that handle your daily operations
            </h1>

            <p className='text-muted-foreground max-w-3xl text-xl'>
              Automate routine tasks, connect your tools, and let AI agents coordinate workflows so you can focus on
              strategy, not busywork.
            </p>

            <div className='flex flex-wrap items-center justify-center gap-4'>
              <Button href='/demo' color='secondary' size='xl'>
                Explore Workspace
              </Button>
              <Button href='/pricing' size='xl' className='bg-blue-600 hover:bg-blue-700'>
                Deploy Agents
              </Button>
            </div>
          </div>

          <div className='flex w-full items-center justify-center gap-4 max-sm:flex-col sm:gap-7'>
            <div className='flex flex-1 items-center justify-end gap-3'>
              <div className='flex flex-row items-center justify-center'>
                <AnimatedTooltip
                  items={avatars}
                  className='[&>[data-slot="avatar"]]:border-background -me-3.5 last:-me-0 [&>[data-slot="avatar"]]:border-2 [&>[data-slot="avatar"]]:shadow-md [&>[data-slot="avatar"]]:ring-0'
                />
              </div>
              <div>
                <span className='text-lg font-medium'>12K+</span> <span className='text-muted-foreground'>Users</span>
              </div>
            </div>

            <Separator orientation='vertical' className='data-[orientation=vertical]:h-4 max-sm:hidden' />

            <div className='flex flex-1 items-center gap-3'>
              <Rating readOnly value={4.5} precision={0.5} className='[&_svg]:text-primary' />
              <div>
                <span className='text-lg font-medium'>4.5</span> <span className='text-muted-foreground'>Ratings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full gap-0'>
        <div className='border-b px-4 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            {/* Tabs List */}
            <ScrollArea className='-m-px'>
              <TabsList className='-ml-px h-auto w-full -space-x-px rounded-none bg-transparent p-0 pl-px'>
                {tabs.map(({ name, value }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className='border-border focus-visible:outline-primary/20 data-[state=active]:border-primary/60! data-[state=active]:bg-muted! h-15 flex-1 cursor-pointer rounded-none px-4 py-2.5 text-base focus-visible:ring-0 focus-visible:outline-[3px] focus-visible:-outline-offset-4 data-[state=active]:z-1'
                  >
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation='horizontal' className='z-2' />
            </ScrollArea>
          </div>
        </div>

        <div className='px-4 sm:px-6 lg:px-8'>
          <div className='relative mx-auto h-151 max-w-7xl'>
            {/* Background Dots */}
            <div className='pointer-events-none absolute inset-0 -z-2 [background-image:radial-gradient(color-mix(in_oklab,var(--primary)10%,transparent)_2px,transparent_2px)] [background-size:20px_20px] bg-fixed' />

            {/* Background Gradient Overlay */}
            <div className='bg-background pointer-events-none absolute inset-0 -z-1 flex items-center justify-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]' />

            <ScrollArea className='h-full [&>[data-slot="scroll-area-viewport"]]:h-full [&>[data-slot="scroll-area-viewport"]>div]:h-full'>
              {tabs.map(tab => (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  className='flex h-full items-center justify-center p-4 sm:p-6 lg:p-8'
                >
                  {tab.content}
                </TabsContent>
              ))}

              <ScrollBar orientation='horizontal' />
            </ScrollArea>
          </div>
        </div>
      </Tabs>
    </section>
  )
}

export default HeroSection
