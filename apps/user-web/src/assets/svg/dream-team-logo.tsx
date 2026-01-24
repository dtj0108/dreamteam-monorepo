import type { SVGAttributes } from 'react'

const DreamTeamLogo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 128 128' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      {/* Central hub representing connected agents */}
      <circle cx='64' cy='64' r='24' stroke='currentColor' strokeWidth='6' />

      {/* Connection nodes around the center */}
      <circle cx='64' cy='24' r='8' fill='currentColor' />
      <circle cx='64' cy='104' r='8' fill='currentColor' />
      <circle cx='24' cy='64' r='8' fill='currentColor' />
      <circle cx='104' cy='64' r='8' fill='currentColor' />

      {/* Diagonal connection nodes */}
      <circle cx='35' cy='35' r='6' fill='currentColor' />
      <circle cx='93' cy='35' r='6' fill='currentColor' />
      <circle cx='35' cy='93' r='6' fill='currentColor' />
      <circle cx='93' cy='93' r='6' fill='currentColor' />

      {/* Connection lines */}
      <line x1='64' y1='40' x2='64' y2='32' stroke='currentColor' strokeWidth='4' />
      <line x1='64' y1='96' x2='64' y2='88' stroke='currentColor' strokeWidth='4' />
      <line x1='40' y1='64' x2='32' y2='64' stroke='currentColor' strokeWidth='4' />
      <line x1='96' y1='64' x2='88' y2='64' stroke='currentColor' strokeWidth='4' />
    </svg>
  )
}

export default DreamTeamLogo
