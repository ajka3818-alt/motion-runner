import type { MotionType } from '../motion/types'

export type Lane = 0 | 1 | 2

export interface Obstacle {
  id: number
  lane: Lane
  kind: 'barrier' | 'overhead' | 'gate'
  required: MotionType
  z: number
  passed: boolean
}

export interface GameStats {
  score: number
  distance: number
  combo: number
  bestCombo: number
  hits: number
  perfect: number
  good: number
  weak: number
  totalActions: number
  byMotion: Record<string, { ok: number; total: number }>
}
