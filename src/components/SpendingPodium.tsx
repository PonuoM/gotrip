import Link from 'next/link'
import { AvatarBadge } from './AvatarBadge'
import { formatCurrency } from '@/lib/utils'

interface Row {
  memberId: string
  name: string
  animal?: string | null
  bgColor?: string | null
  total: number
}

interface Props {
  tripId: string
  rows: Row[]              // pre-sorted descending by total
  currency: string
  lang: 'th' | 'en'
  myMemberId: string
}

export function SpendingPodium({ tripId, rows, currency, lang, myMemberId }: Props) {
  if (rows.length === 0 || rows[0].total === 0) return null

  const max = rows[0].total

  return (
    <div className="mt-6 card-base p-4 overflow-hidden">
      {/* Trophy + speech bubble */}
      <div className="flex items-center gap-3">
        <TrophySvg />
        <div className="relative bubble-wiggle">
          {/* Tail pointing left at the cup */}
          <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[7px] border-r-brand-black" />
          <div className="bg-brand-black text-white rounded-2xl px-3 py-2 text-[11px] font-black tracking-wide leading-tight">
            {lang === 'th' ? 'ดูยอดใช้จ่ายสิ!' : 'Check the spending!'}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="mt-4 space-y-2.5">
        {rows.map((row, idx) => {
          const pct = (row.total / max) * 100
          const medal = ['🥇', '🥈', '🥉'][idx]
          const isMe = row.memberId === myMemberId
          const barColor = row.bgColor || '#E63946'
          return (
            <div key={row.memberId} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm">{medal || ''}</span>
              <AvatarBadge
                animal={row.animal}
                bgColor={row.bgColor}
                fallbackLetter={row.name[0]}
                size="sm"
                ringClass={isMe ? 'ring-2 ring-brand-red' : ''}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5 gap-2">
                  <span className="text-xs font-black truncate">
                    {row.name}
                    {isMe && <span className="ml-1 text-[9px] text-brand-red">★</span>}
                  </span>
                  <span className="text-xs font-black shrink-0">
                    {formatCurrency(row.total, currency)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bar-grow rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Link
        href={`/trips/${tripId}/expenses`}
        className="mt-4 block text-center text-[11px] font-black tracking-[2px] text-brand-red no-underline"
      >
        {lang === 'th' ? 'ดูค่าใช้จ่ายทั้งหมด →' : 'SEE ALL EXPENSES →'}
      </Link>
    </div>
  )
}

function TrophySvg() {
  return (
    <svg viewBox="0 0 64 64" className="w-16 h-16 trophy-bob shrink-0" aria-label="trophy">
      <defs>
        <linearGradient id="trophyGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#FFE176" />
          <stop offset="50%" stopColor="#F5B500" />
          <stop offset="100%" stopColor="#B47A00" />
        </linearGradient>
        <linearGradient id="trophyShineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#FFF" stopOpacity="0" />
          <stop offset="50%"  stopColor="#FFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="cupClip">
          <path d="M18 14 H46 V28 Q46 42 32 42 Q18 42 18 28 Z" />
        </clipPath>
      </defs>

      {/* Sparkles — twinkle */}
      <g className="trophy-sparkle">
        <path d="M8 14 l1.2 0 l0.4 -1.2 l0.4 1.2 l1.2 0 l-1 0.7 l0.4 1.2 l-1 -0.7 l-1 0.7 l0.4 -1.2 z" fill="#F5B500" />
        <path d="M54 8 l1 0 l0.3 -1 l0.3 1 l1 0 l-0.8 0.6 l0.3 1 l-0.8 -0.6 l-0.8 0.6 l0.3 -1 z" fill="#F5B500" />
        <circle cx="56" cy="22" r="1" fill="#FFE176" />
        <circle cx="8" cy="28" r="1" fill="#FFE176" />
      </g>

      {/* Handles */}
      <path d="M18 18 Q10 18 10 24 Q10 30 18 30" fill="none" stroke="#B47A00" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 18 Q54 18 54 24 Q54 30 46 30" fill="none" stroke="#B47A00" strokeWidth="3" strokeLinecap="round" />

      {/* Cup body */}
      <path
        d="M18 14 H46 V28 Q46 42 32 42 Q18 42 18 28 Z"
        fill="url(#trophyGold)"
        stroke="#1A1A1A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Cup rim */}
      <rect x="16" y="11" width="32" height="4" rx="1" fill="url(#trophyGold)" stroke="#1A1A1A" strokeWidth="1.5" />

      {/* Star on cup face */}
      <text x="32" y="33" textAnchor="middle" fontSize="13" fontWeight="900" fill="#1A1A1A">★</text>

      {/* Stem */}
      <rect x="29" y="42" width="6" height="6" fill="#7A4F00" stroke="#1A1A1A" strokeWidth="1.2" />

      {/* Base */}
      <rect x="20" y="48" width="24" height="6" rx="1" fill="#1A1A1A" />
      <ellipse cx="32" cy="56" rx="14" ry="1.6" fill="#000" opacity="0.25" />

      {/* Animated shine sweep */}
      <g clipPath="url(#cupClip)">
        <rect className="trophy-shine" x="-20" y="0" width="10" height="64" fill="url(#trophyShineGrad)" />
      </g>
    </svg>
  )
}
