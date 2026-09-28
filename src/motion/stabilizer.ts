import type { MotionFeedback, MotionType } from './types'

export interface StableMotion {
  feedback: MotionFeedback
  triggered: MotionType | null
}

export class MotionStabilizer {
  private lastType: MotionType = 'UNKNOWN'
  private since = 0
  private cooldownUntil = 0

  constructor(
    private holdMs = 180,
    private cooldownMs = 650,
  ) {}

  update(feedback: MotionFeedback, now = performance.now()): StableMotion {
    if (feedback.motion !== this.lastType) {
      this.lastType = feedback.motion
      this.since = now
    }

    if (!feedback.isCorrect) {
      return { feedback, triggered: null }
    }

    if (['CENTER', 'UNKNOWN'].includes(feedback.motion)) {
      return { feedback, triggered: null }
    }

    if (now < this.cooldownUntil) {
      return { feedback, triggered: null }
    }

    if (now - this.since >= this.holdMs) {
      this.cooldownUntil = now + this.cooldownMs
      this.since = now
      return { feedback, triggered: feedback.motion }
    }

    return { feedback, triggered: null }
  }
}
