import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'

const Features = () => {
  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mx-auto mb-12 text-center sm:mb-16 lg:mb-24'>
          <h2 className='text-2xl font-semibold md:text-3xl lg:text-4xl'>
            Agents that do the work of entire teams — easy to train.
          </h2>
        </div>

        <div className='mx-auto max-w-4xl'>
          <Card className='shadow-none'>
            <CardContent className='flex flex-col gap-6'>
              <div className='bg-muted flex h-[420px] w-full items-center justify-center overflow-hidden rounded-lg'>
                <div className='flex flex-col items-center gap-3 sm:gap-5'>
                  {/* Label */}
                  <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>Your Command</p>

                  {/* Orchestrator */}
                  <div className='flex flex-col items-center'>
                    <div className='bg-background flex size-16 items-center justify-center rounded-full border shadow-lg sm:size-20'>
                      <span className='text-3xl sm:text-4xl'>🧠</span>
                    </div>
                    <p className='mt-2 text-sm font-medium'>Orchestrator</p>
                  </div>

                  {/* Connection lines */}
                  <div className='text-muted-foreground flex items-center gap-10 text-sm sm:gap-20'>
                    <span>↙</span>
                    <span>↓</span>
                    <span>↘</span>
                  </div>

                  {/* Department heads */}
                  <div className='flex items-center gap-6 sm:gap-10'>
                    <div className='flex flex-col items-center gap-1.5'>
                      <div className='bg-background flex size-12 items-center justify-center rounded-xl border shadow-md sm:size-14'>
                        <span className='text-2xl sm:text-3xl'>💼</span>
                      </div>
                      <span className='text-xs text-muted-foreground'>Sales</span>
                    </div>
                    <div className='flex flex-col items-center gap-1.5'>
                      <div className='bg-background flex size-12 items-center justify-center rounded-xl border shadow-md sm:size-14'>
                        <span className='text-2xl sm:text-3xl'>💵</span>
                      </div>
                      <span className='text-xs text-muted-foreground'>Finance</span>
                    </div>
                    <div className='flex flex-col items-center gap-1.5'>
                      <div className='bg-background flex size-12 items-center justify-center rounded-xl border shadow-md sm:size-14'>
                        <span className='text-2xl sm:text-3xl'>📊</span>
                      </div>
                      <span className='text-xs text-muted-foreground'>Operations</span>
                    </div>
                  </div>

                  {/* Connection lines */}
                  <div className='text-muted-foreground flex items-center gap-12 text-sm sm:gap-24'>
                    <span>↓</span>
                    <span>↓</span>
                    <span>↓</span>
                  </div>

                  {/* Specialists */}
                  <div className='flex items-center gap-2 sm:gap-4'>
                    <div className='flex flex-col items-center gap-1'>
                      <div className='bg-background flex size-9 items-center justify-center rounded-lg border shadow-sm sm:size-11'>
                        <span className='text-base sm:text-lg'>📞</span>
                      </div>
                      <span className='text-[10px] text-muted-foreground'>Calls</span>
                    </div>
                    <div className='flex flex-col items-center gap-1'>
                      <div className='bg-background flex size-9 items-center justify-center rounded-lg border shadow-sm sm:size-11'>
                        <span className='text-base sm:text-lg'>✉️</span>
                      </div>
                      <span className='text-[10px] text-muted-foreground'>Email</span>
                    </div>
                    <div className='flex flex-col items-center gap-1'>
                      <div className='bg-background flex size-9 items-center justify-center rounded-lg border shadow-sm sm:size-11'>
                        <span className='text-base sm:text-lg'>🧾</span>
                      </div>
                      <span className='text-[10px] text-muted-foreground'>Invoices</span>
                    </div>
                    <div className='flex flex-col items-center gap-1'>
                      <div className='bg-background flex size-9 items-center justify-center rounded-lg border shadow-sm sm:size-11'>
                        <span className='text-base sm:text-lg'>📈</span>
                      </div>
                      <span className='text-[10px] text-muted-foreground'>Reports</span>
                    </div>
                    <div className='flex flex-col items-center gap-1'>
                      <div className='bg-background flex size-9 items-center justify-center rounded-lg border shadow-sm sm:size-11'>
                        <span className='text-base sm:text-lg'>🔍</span>
                      </div>
                      <span className='text-[10px] text-muted-foreground'>Research</span>
                    </div>
                    <div className='flex flex-col items-center gap-1'>
                      <div className='bg-background flex size-9 items-center justify-center rounded-lg border shadow-sm sm:size-11'>
                        <span className='text-base sm:text-lg'>📝</span>
                      </div>
                      <span className='text-[10px] text-muted-foreground'>Docs</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className='space-y-2 text-center'>
                <CardTitle className='text-xl font-semibold'>Autonomous Execution</CardTitle>
                <CardDescription className='mx-auto max-w-lg text-base'>
                  One command triggers a cascade of coordinated actions across multiple specialists.
                  Agents handle the busywork so you can focus on strategy.
                </CardDescription>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default Features
