import * as motion from 'motion/react-client'

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

import LogoVector from '@/assets/svg/logo-vector'

import { MotionPreset } from '@/components/ui/motion-preset'
import { Marquee } from '@/components/ui/marquee'

const avatars = [
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    fallback: 'OS',
    name: 'Olivia Sparks'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    fallback: 'HL',
    name: 'Howard Lloyd'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    fallback: 'HR',
    name: 'Hallie Richards'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-16.png',
    fallback: 'JW',
    name: 'Jenny Wilson'
  }
]

const Features = () => {
  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mx-auto mb-12 text-center sm:mb-16 lg:mb-24'>
          <h2 className='text-2xl font-semibold md:text-3xl lg:text-4xl'>
            One unified intelligence powering your business
          </h2>
        </div>

        <div className='relative grid grid-cols-1 gap-6 md:grid-cols-2 md:before:absolute md:before:inset-y-0 md:before:z-[-1] md:before:w-full md:before:overflow-x-auto md:before:bg-[url(https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-40.png)] md:before:bg-contain md:before:bg-right md:before:bg-no-repeat lg:grid-cols-3'>
          {/*  Card 1 */}
          <MotionPreset transition={{ duration: 0 }}>
            <Card className='h-full shadow-none'>
              <CardContent className='flex flex-col gap-4'>
                <div className='bg-muted flex h-72 w-full flex-col items-center justify-center rounded-md'>
                  <div className='flex flex-col items-center'>
                    <h4 className='text-5xl font-semibold'>50k+</h4>
                    <p className='text-muted-foreground mb-2.5'>actions daily</p>
                    <div className='flex -space-x-2 hover:space-x-2'>
                      {avatars.map((avatar, index) => (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <Avatar className='ring-background size-12 ring-2 transition-all duration-300 ease-in-out hover:z-1 hover:-translate-y-1 hover:scale-120'>
                              <AvatarImage src={avatar.src} alt={avatar.name} />
                              <AvatarFallback className='text-xs'>{avatar.fallback}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side='bottom'>{avatar.name}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>
                <div className='space-y-2'>
                  <CardTitle className='text-lg font-semibold'>Trusted by Teams</CardTitle>
                  <CardDescription className='text-base'>
                    Join thousands of teams already automating their workflows with AI agents.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </MotionPreset>

          {/*  Card 2 */}
          <MotionPreset transition={{ duration: 0 }}>
            <Card className='h-full shadow-none'>
              <CardContent className='flex flex-col gap-4'>
                <div className='bg-muted flex h-72 w-full items-center justify-center rounded-md'>
                  <div className='flex w-full max-w-58.5 flex-col items-start gap-4'>
                    <div className='flex -space-x-2 hover:space-x-2'>
                      {avatars.map((avatar, index) => (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <Avatar className='ring-background size-12 ring-2 transition-all duration-300 ease-in-out hover:z-1 hover:-translate-y-1 hover:scale-120'>
                              <AvatarImage src={avatar.src} alt={avatar.name} />
                              <AvatarFallback className='text-xs'>{avatar.fallback}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>{avatar.name}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div>
                      <h4 className='text-lg font-semibold'>Agent Hierarchies</h4>
                      <p className='text-muted-foreground'>Specialist agents working together seamlessly.</p>
                    </div>
                    <div className='flex gap-2'>
                      <Badge className='rounded-md'>Sales</Badge>
                      <Badge className='rounded-md'>Finance</Badge>
                      <Badge className='rounded-md'>Ops</Badge>
                      <Badge className='rounded-md'>Data</Badge>
                    </div>
                  </div>
                </div>
                <div className='space-y-2'>
                  <CardTitle className='text-lg font-semibold'>Hierarchical Coordination</CardTitle>
                  <CardDescription className='text-base'>
                    Agents delegate up and down the hierarchy, ensuring the right specialist handles each task.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </MotionPreset>

          {/*  Card 3 */}
          <MotionPreset transition={{ duration: 0 }}>
            <Card className='h-full shadow-none'>
              <CardContent className='flex flex-col gap-4'>
                <div className='bg-muted flex h-72 w-full flex-col items-center justify-center overflow-hidden rounded-md'>
                  <Marquee pauseOnHover duration={20} reverse className='-rotate-6 items-center gap-6'>
                    <div className='flex flex-col gap-5'>
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-53.png'
                        alt='discord'
                        className='size-13 shrink-0 object-contain'
                      />
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-52.png'
                        alt='wii'
                        className='size-13 shrink-0 object-contain'
                      />
                    </div>
                    <div className='mt-3.5 flex flex-col gap-5'>
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-51.png'
                        alt='Star Health'
                        className='size-13 shrink-0 object-contain'
                      />
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-50.png'
                        alt='arrow'
                        className='size-13 shrink-0 object-contain'
                      />
                    </div>
                    <div className='flex flex-col gap-5'>
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-49.png'
                        alt='twiter'
                        className='size-13 shrink-0 object-contain'
                      />
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-48.png'
                        alt='star'
                        className='size-13 shrink-0 object-contain'
                      />
                    </div>
                    <div className='mt-3.5 flex flex-col gap-5'>
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-47.png'
                        alt='stripe'
                        className='size-13 shrink-0 object-contain'
                      />
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-46.png'
                        alt='slack'
                        className='size-13 shrink-0 object-contain'
                      />
                    </div>
                    <div className='flex flex-col gap-5'>
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-45.png'
                        alt='insta'
                        className='size-13 shrink-0 object-contain'
                      />
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-44.png'
                        alt='facebook'
                        className='size-13 shrink-0 object-contain'
                      />
                    </div>
                    <div className='mt-3.5 flex flex-col gap-5'>
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-43.png'
                        alt='ai'
                        className='size-13 shrink-0 object-contain'
                      />
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-42.png'
                        alt='youtube'
                        className='size-13 shrink-0 object-contain'
                      />
                    </div>
                    <div className='flex flex-col gap-5'>
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-41.png'
                        alt='green'
                        className='size-13 shrink-0 object-contain'
                      />
                      <img
                        src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-54.png'
                        alt='chart'
                        className='size-13 shrink-0 object-contain'
                      />
                    </div>
                  </Marquee>
                </div>
                <div className='space-y-2'>
                  <CardTitle className='text-lg font-semibold'>Connect Your Tools</CardTitle>
                  <CardDescription className='text-base'>
                    Integrate with Slack, Gmail, Stripe, and 1000+ other tools your team already uses.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </MotionPreset>

          {/*  Card 4  */}
          <MotionPreset
            className='group md:col-span-2 md:max-lg:order-1'
            transition={{ duration: 0 }}
          >
            <Card className='shadow-none md:h-full'>
              <CardContent className='flex flex-col gap-4'>
                <div className='bg-muted flex h-72 w-full items-center justify-center overflow-hidden rounded-md'>
                  <div className='flex flex-col items-center gap-2 sm:gap-4'>
                    {/* Orchestrator */}
                    <div className='flex flex-col items-center'>
                      <div className='bg-background flex size-12 items-center justify-center rounded-full border-2 border-primary shadow-lg sm:size-16'>
                        <span className='text-2xl sm:text-3xl'>🧠</span>
                      </div>
                    </div>

                    {/* Connection lines */}
                    <div className='text-muted-foreground flex items-center gap-6 text-xs sm:gap-12 sm:text-sm'>
                      <span>↙</span>
                      <span>↓</span>
                      <span>↘</span>
                    </div>

                    {/* Department heads */}
                    <div className='flex items-center gap-3 sm:gap-6'>
                      <div className='bg-background flex size-10 items-center justify-center rounded-xl border shadow-md sm:size-12'>
                        <span className='text-lg sm:text-2xl'>💼</span>
                      </div>
                      <div className='bg-background flex size-10 items-center justify-center rounded-xl border shadow-md sm:size-12'>
                        <span className='text-lg sm:text-2xl'>💵</span>
                      </div>
                      <div className='bg-background flex size-10 items-center justify-center rounded-xl border shadow-md sm:size-12'>
                        <span className='text-lg sm:text-2xl'>📊</span>
                      </div>
                    </div>

                    {/* Connection lines */}
                    <div className='text-muted-foreground flex items-center gap-8 text-xs sm:gap-16 sm:text-sm'>
                      <span>↓</span>
                      <span>↓</span>
                      <span>↓</span>
                    </div>

                    {/* Specialists */}
                    <div className='flex items-center gap-1.5 sm:gap-3'>
                      <div className='bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm sm:size-9'>
                        <span className='text-sm sm:text-base'>📞</span>
                      </div>
                      <div className='bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm sm:size-9'>
                        <span className='text-sm sm:text-base'>✉️</span>
                      </div>
                      <div className='bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm sm:size-9'>
                        <span className='text-sm sm:text-base'>🧾</span>
                      </div>
                      <div className='bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm sm:size-9'>
                        <span className='text-sm sm:text-base'>📈</span>
                      </div>
                      <div className='bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm sm:size-9'>
                        <span className='text-sm sm:text-base'>🔍</span>
                      </div>
                      <div className='bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm sm:size-9'>
                        <span className='text-sm sm:text-base'>📝</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='space-y-2'>
                  <CardTitle className='text-lg font-semibold'>Autonomous Execution</CardTitle>
                  <CardDescription className='text-base'>
                    One command triggers a cascade of coordinated actions across multiple specialists.
                    Agents handle the busywork so you can focus on strategy.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </MotionPreset>

          {/*  Card 5 */}
          <MotionPreset transition={{ duration: 0 }}>
            <Card className='h-full shadow-none'>
              <CardContent className='flex flex-col gap-4'>
                <div className='bg-muted relative flex h-72 w-full flex-col items-center justify-center rounded-md'>
                  <motion.svg
                    width='1em'
                    height='1em'
                    viewBox='0 0 247 247'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    className='relative size-full'
                    initial='hidden'
                    animate='visible'
                  >
                    <motion.circle
                      cx='123.5'
                      cy='123.5'
                      r='60'
                      fill='color-mix(in oklab, var(--primary) 25%, transparent)'
                      variants={{
                        visible: {
                          scale: [1, 0.85, 1],
                          transition: {
                            scale: { delay: 0.24, duration: 3.75, repeat: Infinity, ease: 'easeOut' }
                          }
                        }
                      }}
                    />

                    <motion.circle
                      cx='123.5'
                      cy='123.5'
                      r='90'
                      fill='color-mix(in oklab, var(--primary) 15%, transparent)'
                      variants={{
                        visible: {
                          scale: [1, 0.85, 1],
                          transition: {
                            scale: { delay: 0.12, duration: 3.75, repeat: Infinity, ease: 'easeOut' }
                          }
                        }
                      }}
                    />
                    <motion.circle
                      cx='123.5'
                      cy='123.5'
                      r='120'
                      fill='color-mix(in oklab, var(--primary) 5%, transparent)'
                      variants={{
                        visible: {
                          scale: [1, 0.85, 1],
                          transition: {
                            scale: { duration: 3.75, repeat: Infinity, ease: 'easeOut' }
                          }
                        }
                      }}
                    />
                  </motion.svg>
                  <div className='bg-primary border-background absolute top-1/2 left-1/2 z-1 flex size-20 -translate-1/2 items-center justify-center rounded-full border-2'>
                    <LogoVector className='size-19 text-white dark:text-black' />
                  </div>
                </div>
                <div className='space-y-2'>
                  <CardTitle className='text-lg font-semibold'>Unified Intelligence</CardTitle>
                  <CardDescription className='text-base'>
                    All agents share context and memory, working as one cohesive system.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          </MotionPreset>
        </div>
      </div>
    </section>
  )
}

export default Features
