'use client'
import { useRef } from 'react'

import {
  BriefcaseIcon,
  TrendingUpIcon,
  DollarSignIcon,
  UsersIcon,
  MessageSquareIcon,
  BarChart3Icon
} from 'lucide-react'

import { Button } from '@/components/base/buttons/button'
import { Badge } from '@/components/ui/badge'

import { AnimatedBeam } from '@/components/ui/animated-beam'
import LogoVector from '@/assets/svg/logo-vector'

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const iconRef1 = useRef<HTMLDivElement>(null)
  const iconRef2 = useRef<HTMLDivElement>(null)
  const iconRef3 = useRef<HTMLDivElement>(null)
  const iconRef4 = useRef<HTMLDivElement>(null)
  const iconRef5 = useRef<HTMLDivElement>(null)
  const iconRef6 = useRef<HTMLDivElement>(null)
  const iconRef7 = useRef<HTMLDivElement>(null)
  const spanRef1 = useRef<HTMLSpanElement>(null)
  const spanRef2 = useRef<HTMLSpanElement>(null)
  const spanRef3 = useRef<HTMLSpanElement>(null)
  const spanRef4 = useRef<HTMLSpanElement>(null)
  const spanRef5 = useRef<HTMLSpanElement>(null)
  const spanRef6 = useRef<HTMLSpanElement>(null)
  const spanRef7 = useRef<HTMLSpanElement>(null)
  const spanRef8 = useRef<HTMLSpanElement>(null)

  return (
    <section className='flex-1 overflow-hidden py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 sm:gap-16 sm:px-6 lg:gap-24 lg:px-8'>
        {/* Hero Content */}
        <div className='flex flex-col items-center gap-4 text-center'>
          <Badge variant='outline' className='text-sm font-normal'>
            Introducing AI Agents
          </Badge>

          <h1 className='text-2xl font-semibold sm:text-3xl lg:text-5xl lg:font-bold'>
            Deploy AI Agents that work autonomously
            <br />
            <span className='underline underline-offset-3'>in minutes</span>
          </h1>

          <p className='text-muted-foreground max-w-4xl text-xl'>
            Set them up once, they work forever.
            <br />
            While you do, whatever.
          </p>

          <div className='flex flex-wrap items-center gap-4'>
            <Button href='/demo/crm' color='secondary' size='xl'>
              Explore Workspace
            </Button>
            <Button href='/pricing' size='xl' className='bg-blue-600 hover:bg-blue-700'>
              Deploy Agents
            </Button>
          </div>
        </div>
        <div ref={containerRef} className='relative flex w-full flex-col items-center'>
          {/* Top row - icons 1 and 2 */}
          <div className='flex w-full max-w-xs items-center justify-between md:max-w-4xl'>
            <div className='flex items-center gap-4 md:gap-30'>
              <div
                ref={iconRef1}
                className='bg-background relative z-10 flex size-10 items-center justify-center rounded-xl border-[1.5px] shadow-md md:size-12 lg:size-15'
              >
                <TrendingUpIcon className='size-5 stroke-1 md:size-7 lg:size-10' />
              </div>
              <span ref={spanRef1} className='hidden size-0.5 md:block'></span>
            </div>
            <div className='flex items-center gap-4 md:gap-30'>
              <span ref={spanRef2} className='hidden size-0.5 md:block'></span>
              <div
                ref={iconRef2}
                className='bg-background relative z-10 flex size-10 items-center justify-center rounded-xl border-[1.5px] shadow-md md:size-12 lg:size-15'
              >
                <MessageSquareIcon className='size-5 stroke-1 md:size-7 lg:size-8' />
              </div>
            </div>
          </div>

          {/* Middle row - icons 3, center logo, icon 5 */}
          <div className='flex w-full items-center justify-between py-2.5'>
            <div
              ref={iconRef3}
              className='bg-background relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] shadow-xl md:size-18 lg:size-23'
            >
              <BriefcaseIcon className='size-6 stroke-1 md:size-10 lg:size-13' />
            </div>
            <div className='flex items-center justify-between md:w-full md:max-w-70 lg:max-w-100'>
              <div className='hidden w-full max-w-20 justify-between md:flex'>
                <span ref={spanRef3} className='size-0.5'></span>
                <span ref={spanRef4} className='size-0.5'></span>
              </div>
              <div ref={iconRef4} className='bg-background relative z-10 flex items-center justify-center rounded-xl border p-1.5 md:p-2'>
                <div className='bg-secondary flex size-14 items-center justify-center rounded-xl border-[1.5px] shadow-xl md:size-23'>
                  <div className='flex size-9 items-center justify-center rounded-xl bg-black md:size-16'>
                    <LogoVector className='size-9 text-white md:size-16' />
                  </div>
                </div>
              </div>
              <div className='hidden w-full max-w-20 justify-between md:flex'>
                <span ref={spanRef5} className='size-0.5'></span>
                <span ref={spanRef6} className='size-0.5'></span>
              </div>
            </div>
            <div
              ref={iconRef5}
              className='bg-background relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] shadow-xl md:size-18 lg:size-23'
            >
              <BarChart3Icon className='size-6 stroke-1 md:size-10 lg:size-13' />
            </div>
          </div>

          {/* Bottom row - icons 6 and 7 */}
          <div className='flex w-full max-w-xs items-center justify-between md:max-w-4xl'>
            <div className='flex items-center gap-4 md:gap-30'>
              <div
                ref={iconRef6}
                className='bg-background relative z-10 flex size-10 items-center justify-center rounded-xl border-[1.5px] shadow-md md:size-12 lg:size-15'
              >
                <DollarSignIcon className='size-5 stroke-1 md:size-6 lg:size-8' />
              </div>
              <span ref={spanRef7} className='hidden size-0.5 md:block'></span>
            </div>
            <div className='flex items-center gap-4 md:gap-30'>
              <span ref={spanRef8} className='hidden size-0.5 md:block'></span>
              <div
                ref={iconRef7}
                className='bg-background relative z-10 flex size-10 items-center justify-center rounded-xl border-[1.5px] shadow-md md:size-12 lg:size-15'
              >
                <UsersIcon className='size-5 stroke-1 md:size-7 lg:size-11' />
              </div>
            </div>
          </div>

          {/* Desktop beams - complex path through span waypoints */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef1}
            toRef={spanRef1}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef1}
            toRef={spanRef3}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={-45}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef2}
            toRef={spanRef2}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef2}
            toRef={spanRef6}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={-45}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef6}
            toRef={spanRef7}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef7}
            toRef={spanRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={40}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef7}
            toRef={spanRef8}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef8}
            toRef={spanRef5}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={40}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef3}
            toRef={spanRef3}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef3}
            toRef={spanRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef4}
            toRef={iconRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef4}
            toRef={spanRef5}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef5}
            toRef={spanRef6}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={spanRef6}
            toRef={iconRef5}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 max-md:hidden'
          />

          {/* Mobile beams - direct connections from each icon to center */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef1}
            toRef={iconRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={-20}
            className='z-0 md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef2}
            toRef={iconRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={20}
            className='z-0 md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef3}
            toRef={iconRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef4}
            toRef={iconRef5}
            gradientStartColor='var(--primary)'
            duration={4.5}
            className='z-0 md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef6}
            toRef={iconRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={20}
            className='z-0 md:hidden'
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={iconRef7}
            toRef={iconRef4}
            gradientStartColor='var(--primary)'
            duration={4.5}
            curvature={-20}
            className='z-0 md:hidden'
          />
        </div>
      </div>
    </section>
  )
}

export default HeroSection
