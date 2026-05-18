import Image from 'next/image'

export const AVATAR_ANIMALS = ['cat', 'dog', 'bear', 'panda', 'rabbit', 'koala'] as const
export type AvatarAnimal = typeof AVATAR_ANIMALS[number]

export const AVATAR_LABELS: Record<AvatarAnimal, { th: string; en: string; emoji: string }> = {
  cat:    { th: 'แมว',    en: 'Cat',    emoji: '🐱' },
  dog:    { th: 'หมา',    en: 'Dog',    emoji: '🐶' },
  bear:   { th: 'หมี',    en: 'Bear',   emoji: '🐻' },
  panda:  { th: 'แพนด้า',  en: 'Panda',  emoji: '🐼' },
  rabbit: { th: 'กระต่าย', en: 'Rabbit', emoji: '🐰' },
  koala:  { th: 'โคอาลา', en: 'Koala',  emoji: '🐨' },
}

export const AVATAR_COLORS = [
  '#E63946', '#F5B500', '#0F6E56', '#185FA5',
  '#534AB7', '#993556', '#993C1D', '#444441',
] as const
export type AvatarColor = typeof AVATAR_COLORS[number]

export const DEFAULT_BG = '#E63946'

const SIZES = {
  xs: 'w-6 h-6  text-[10px]',
  sm: 'w-8 h-8  text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-24 h-24 text-4xl',
} as const

const PX = { xs: 24, sm: 32, md: 40, lg: 64, xl: 96 } as const

interface Props {
  animal?: string | null
  bgColor?: string | null
  fallbackLetter?: string | null
  size?: keyof typeof SIZES
  ringClass?: string  // extra ring/border classes
  className?: string
}

export function AvatarBadge({
  animal, bgColor, fallbackLetter, size = 'md', ringClass = '', className = '',
}: Props) {
  const bg = bgColor || DEFAULT_BG
  const px = PX[size]
  const isAnimal = animal && (AVATAR_ANIMALS as readonly string[]).includes(animal)

  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center font-black text-white shrink-0 ${SIZES[size]} ${ringClass} ${className}`}
      style={{ backgroundColor: bg }}
    >
      {isAnimal ? (
        <Image
          src={`/avatars/${animal}.png`}
          alt={animal as string}
          width={px}
          height={px}
          // Scale up to fill the circle (stickers have transparent padding);
          // nudge down so the head (which is in the upper half) lands centred.
          className="object-contain w-full h-full scale-[1.75] translate-y-[12%]"
          priority={false}
        />
      ) : (
        <span>{(fallbackLetter || '?').toUpperCase().slice(0, 1)}</span>
      )}
    </div>
  )
}
