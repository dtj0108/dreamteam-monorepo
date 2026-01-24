'use client'

import { useEffect, useState } from 'react'

import { motion } from 'motion/react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export type NotificationCard = {
  id: string
  name: string
  time: string
  message: string
  avatar?: string
  emoji?: string
  fallback: string
}

const NotificationStack = ({ notifications: initialNotifications }: { notifications: NotificationCard[] }) => {
  const [notifications, setNotifications] = useState<NotificationCard[]>(initialNotifications)

  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prevCards => {
        const newArray = [...prevCards]

        newArray.unshift(newArray.pop()!)

        return newArray
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className='relative h-24.5'>
      {notifications.map((notification, index) => (
        <motion.div
          key={notification.id}
          className='bg-background absolute left-1/2 flex w-full -translate-x-1/2 items-center justify-between rounded-md px-6 py-2.5 shadow-xs'
          style={{
            transformOrigin: 'top center'
          }}
          animate={{
            top: (index - 2) * -8,
            scale: 1 - index * 0.05,
            opacity: 1 - index * 0.25,
            zIndex: notifications.length - index
          }}
          transition={{
            duration: 0.4,
            ease: 'easeInOut'
          }}
        >
          <div className='flex items-center gap-4'>
            <Avatar className='size-12'>
              {notification.avatar ? (
                <AvatarImage src={notification.avatar} alt={notification.name} />
              ) : (
                <div className='flex size-full items-center justify-center bg-gray-100 text-xl'>
                  {notification.emoji || '🤖'}
                </div>
              )}
              <AvatarFallback>{notification.fallback}</AvatarFallback>
            </Avatar>

            <div className='space-y-0.5'>
              <p className='text-base font-semibold'>{notification.name}</p>
              <p className='text-muted-foreground text-sm'>{notification.message}</p>
            </div>
          </div>

          <span className='text-muted-foreground text-xs'>{notification.time}</span>
        </motion.div>
      ))}
    </div>
  )
}

export default NotificationStack
