import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/base/buttons/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'

import { cn } from '@/lib/utils'

import { Marquee } from '@/components/ui/marquee'

type Integration = {
  name: string
  image: string
  bgColor: string
}[]

const integrationApps = [
  {
    name: 'Slack',
    image: 'https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Gmail',
    image: 'https://cdn.worldvectorlogo.com/logos/gmail-icon-1.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Stripe',
    image: 'https://cdn.worldvectorlogo.com/logos/stripe-4.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Notion',
    image: 'https://cdn.worldvectorlogo.com/logos/notion-2.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'GitHub',
    image: 'https://cdn.worldvectorlogo.com/logos/github-icon-1.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Zoom',
    image: 'https://cdn.worldvectorlogo.com/logos/zoom-app.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Figma',
    image: 'https://cdn.worldvectorlogo.com/logos/figma-icon.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Discord',
    image: 'https://cdn.worldvectorlogo.com/logos/discord-6.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Shopify',
    image: 'https://cdn.worldvectorlogo.com/logos/shopify.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'Salesforce',
    image: 'https://cdn.worldvectorlogo.com/logos/salesforce-2.svg',
    bgColor: 'bg-primary/10'
  },
  {
    name: 'HubSpot',
    image: 'https://cdn.worldvectorlogo.com/logos/hubspot.svg',
    bgColor: 'bg-primary/10'
  }
]

const AppIntegration = () => {
  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-12 flex gap-6 max-md:flex-col sm:mb-16 md:items-center md:justify-between lg:mb-24'>
          <div className='max-w-4xl space-y-4'>
            <p className='text-primary text-sm font-medium tracking-wide uppercase'>Integrations</p>
            <h2 className='text-2xl font-semibold md:text-3xl lg:text-4xl'>
              Connect to 1,000+ apps your team already uses
            </h2>
            <p className='text-muted-foreground text-xl'>
              Native integrations with Make.com and a full REST API mean your agents can work with any tool in your stack.
            </p>
          </div>
          <div className='flex flex-col gap-3'>
            <Button
              href='/integrations'
              size='lg'
              color='secondary'
            >
              Browse integrations
            </Button>
            <Button
              href='/docs/api'
              size='lg'
              className='bg-blue-600 hover:bg-blue-700'
            >
              View API docs
            </Button>
          </div>
        </div>
      </div>

      {/* Marquee */}
      <div className='relative'>
        <div className='from-background pointer-events-none absolute inset-y-0 left-0 z-1 w-35 bg-gradient-to-r to-transparent max-sm:hidden' />
        <div className='from-background pointer-events-none absolute inset-y-0 right-0 z-1 w-35 bg-gradient-to-l to-transparent max-sm:hidden' />
        <div className='w-full overflow-hidden'>
          <Marquee pauseOnHover duration={25} gap={1.5}>
            {integrationApps.map((app, index) => (
              <Card key={index} className='bg-muted border-none shadow-none'>
                <CardContent className='flex flex-col items-center gap-2.5'>
                  <Avatar className='size-12 rounded-lg'>
                    <AvatarFallback className={cn('rounded-lg', app.bgColor)}>
                      <img src={app.image} alt={app.name} className='size-7 object-contain' />
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className='text-2xl font-medium'>{app.name}</CardTitle>
                </CardContent>
              </Card>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  )
}

export default AppIntegration
