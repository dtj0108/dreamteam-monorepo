import {
  LayoutGridIcon,
  PaletteIcon,
  FileTextIcon,
  MonitorIcon,
  SmartphoneIcon,
  MoonIcon,
  SettingsIcon,
  BookOpenIcon,
  MessageSquareIcon,
  MailIcon,
  HelpCircleIcon,
  MessageCircleIcon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import Header from '@/components/shadcn-studio/blocks/hero-section-25/header'
import HeroSection from '@/components/shadcn-studio/blocks/hero-section-25/hero-section-25'
import type { Navigation } from '@/components/shadcn-studio/blocks/hero-navigation-01'

const navigationData: Navigation[] = [
  {
    title: 'Home',
    contentClassName: '!w-141 grid-cols-2',
    splitItems: true,
    items: [
      {
        type: 'section',
        title: 'UI Kits',
        items: [
          {
            title: 'Component Library',
            href: '#',
            description: 'Pre-built UI components for faster development',
            icon: <LayoutGridIcon className='size-4' />
          },
          {
            title: 'Design System',
            href: '#',
            description: 'Complete design tokens and guidelines',
            icon: <PaletteIcon className='size-4' />
          },
          {
            title: 'Website Templates',
            href: '#',
            description: 'Ready-to-use website templates for any project',
            icon: <FileTextIcon className='size-4' />,
            badge: (
              <Badge className='border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'>
                Updated
              </Badge>
            )
          },
          {
            title: 'Admin Dashboards',
            href: '#',
            description: 'Professional admin panel templates',
            icon: <MonitorIcon className='size-4' />
          }
        ]
      },
      {
        type: 'section',
        title: 'Features',
        items: [
          {
            title: 'Responsive Design',
            href: '#',
            description: 'Mobile-first responsive components',
            icon: <SmartphoneIcon className='size-4' />
          },
          {
            title: 'Customizable',
            href: '#',
            description: 'Easy to customize and extend to your needs',
            icon: <SettingsIcon className='size-4' />
          },
          {
            title: 'Dark Mode',
            href: '#',
            description: 'Built-in dark mode support',
            icon: <MoonIcon className='size-4' />
          },
          {
            title: 'Documentation',
            href: '#',
            description: 'Comprehensive guides and examples',
            icon: <BookOpenIcon className='size-4' />
          }
        ]
      }
    ]
  },
  {
    title: 'Products',
    href: '#'
  },
  {
    title: 'About Us',
    contentClassName: '!w-38',
    items: [
      { title: 'Our Story', href: '#' },
      { title: 'Team', href: '#' }
    ]
  },
  {
    title: 'Contacts',
    contentClassName: '!w-70',
    items: [
      {
        title: 'Get in Touch',
        href: '#',
        description: 'Contact our support team',
        icon: <MessageSquareIcon className='size-4' />
      },
      {
        title: 'Sales Inquiry',
        href: '#',
        description: 'Talk to our sales team',
        icon: <MailIcon className='size-4' />
      },
      {
        title: 'Help Center',
        href: '#',
        description: 'Find answers to common questions',
        icon: <HelpCircleIcon className='size-4' />
      },
      {
        title: 'Live Chat',
        href: '#',
        description: 'Chat with us in real-time',
        icon: <MessageCircleIcon className='size-4' />
      }
    ]
  }
]

const HeroSectionPage = () => {
  return (
    <div className='flex flex-col'>
      {/* Header Section */}
      <Header navigationData={navigationData} />

      {/* Main Content */}
      <main className='flex flex-col'>
        <HeroSection />
      </main>
    </div>
  )
}

export default HeroSectionPage
