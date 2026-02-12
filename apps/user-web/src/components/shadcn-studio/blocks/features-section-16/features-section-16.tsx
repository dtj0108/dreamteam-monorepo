import { ArrowRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card'

import { BorderBeam } from '@/components/ui/border-beam'

type FeaturesProp = {
  src: string
  darkSrc: string
  title: string
  subTitle: string
  description: string
  href: string
}

const featureData = [
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-29.png',
    darkSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-29-dark.png',
    title: 'They remember everything',
    subTitle: 'Persistent Memory',
    description: 'Your preferences, past decisions, and project context—agents learn from every interaction and never forget.',
    href: '#'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-30.png',
    darkSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-30-dark.png',
    title: 'Teach them new skills',
    subTitle: 'Custom Abilities',
    description: 'Write instructions in plain English. Agents learn new workflows instantly and use them forever.',
    href: '#'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-31.png',
    darkSrc: 'https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/features/image-31-dark.png',
    title: 'Tools built in',
    subTitle: 'Ready to Work',
    description: 'Transactions, projects, leads, knowledge base, web search, and more. Agents chain actions together autonomously.',
    href: '#'
  }
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

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {featureData.map((item) => (
            <Card key={item.title} className='h-full group relative flex flex-col'>
              <BorderBeam
                duration={7}
                size={400}
                borderWidth={1.5}
                className='from-transparent via-[#FE8FB5] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100'
              />
              <BorderBeam
                duration={7}
                delay={4}
                size={400}
                borderWidth={1.5}
                className='from-transparent via-[#FFBE7B] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100'
              />
              <CardContent className='flex flex-1 flex-col gap-6'>
                <div className='bg-muted flex h-46 w-full flex-col items-center justify-end overflow-hidden rounded-md'>
                  <img
                    src={item.src}
                    alt={item.title}
                    className='relative w-full max-w-68 origin-bottom rounded-md object-cover transition-transform duration-300 group-hover:scale-105 dark:hidden'
                  />
                  <img
                    src={item.darkSrc}
                    alt={item.title}
                    className='relative hidden w-full max-w-68 origin-bottom rounded-md object-cover transition-transform duration-300 group-hover:scale-105 dark:inline-block'
                  />
                </div>
                <div className='flex-1 space-y-1.5'>
                  <p className='text-muted-foreground capitalize'>{item.subTitle}</p>
                  <CardTitle className='text-lg font-semibold'> {item.title}</CardTitle>
                  <CardDescription className='text-base'>{item.description}</CardDescription>
                </div>
              </CardContent>
              <CardFooter className='mt-auto'>
                <Button size='lg' className='group' asChild>
                  <a href={item.href}>
                    Learn more
                    <ArrowRightIcon className='transition-transform duration-300 group-hover:translate-x-1' />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
