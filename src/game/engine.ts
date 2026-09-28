import type { MotionFeedback, MotionType } from '../motion/types'
import type { GameStats, Lane, Obstacle } from './types'

const freshStats = (): GameStats => ({
  score: 0,
  distance: 0,
  combo: 0,
  bestCombo: 0,
  hits: 0,
  perfect: 0,
  good: 0,
  weak: 0,
  totalActions: 0,
  byMotion: {},
})

export class RunnerEngine {
  lane: Lane = 1
  y = 0
  crouching = false
  obstacles: Obstacle[] = []
  stats = freshStats()
  running = false
  finished = false
  timeLeft = 60
  private nextId = 1
  private spawnTimer = 0
  private actionWindow: MotionType | null = null
  private actionWindowUntil = 0

  reset() {
    this.lane = 1
    this.y = 0
    this.crouching = false
    this.obstacles = []
    this.stats = freshStats()
    this.running = true
    this.finished = false
    this.timeLeft = 60
    this.spawnTimer = 0
    this.actionWindow = null
    this.actionWindowUntil = 0
  }

  tick(dt: number) {
    if (!this.running || this.finished) return
    this.stats.distance += dt * 0.018
    this.timeLeft = Math.max(0, this.timeLeft - dt / 1000)

    if (this.timeLeft <= 0) {
      this.running = false
      this.finished = true
      return
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnObstacle()
      this.spawnTimer = 1850 + Math.random() * 850
    }

    const speed = 0.34 + Math.min(0.18, this.stats.distance / 5000)
    this.obstacles.forEach((o) => {
      o.z -= (dt / 1000) * speed
    })

    const now = performance.now()
    for (const o of this.obstacles) {
      if (!o.passed && o.z < 0.16) {
        o.passed = true
        const success =
          this.actionWindow === o.required &&
          now <= this.actionWindowUntil &&
          (
            o.required === 'JUMP' ||
            o.required === 'CROUCH' ||
            (o.required === 'LEFT' && this.lane === o.lane) ||
            (o.required === 'RIGHT' && this.lane === o.lane)
          )

        if (success) {
          this.stats.score += 100 + this.stats.combo * 10
          this.stats.combo += 1
          this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo)
        } else {
          this.stats.hits += 1
          this.stats.combo = 0
        }
      }
    }

    this.obstacles = this.obstacles.filter((o) => o.z > -0.05)
  }

  applyMotion(type: MotionType, feedback: MotionFeedback) {
    if (!this.running) return

    if (type === 'LEFT') this.lane = Math.max(0, this.lane - 1) as Lane
    if (type === 'RIGHT') this.lane = Math.min(2, this.lane + 1) as Lane

    this.actionWindow = type
    this.actionWindowUntil = performance.now() + 1000

    this.stats.totalActions += 1
    const key = type
    this.stats.byMotion[key] ??= { ok: 0, total: 0 }
    this.stats.byMotion[key].total += 1
    if (feedback.isCorrect) this.stats.byMotion[key].ok += 1

    if (feedback.quality === 'perfect') {
      this.stats.perfect += 1
      this.stats.score += 50
    } else if (feedback.quality === 'good') {
      this.stats.good += 1
      this.stats.score += 20
    } else {
      this.stats.weak += 1
    }
  }

  private spawnObstacle() {
    const roll = Math.random()
    let required: MotionType
    let kind: Obstacle['kind']

    if (roll < 0.33) {
      required = 'JUMP'
      kind = 'barrier'
    } else if (roll < 0.66) {
      required = 'CROUCH'
      kind = 'overhead'
    } else {
      required = Math.random() > 0.5 ? 'LEFT' : 'RIGHT'
      kind = 'gate'
    }

    const lane: Lane =
      required === 'LEFT'
        ? Math.max(0, this.lane - 1) as Lane
        : required === 'RIGHT'
          ? Math.min(2, this.lane + 1) as Lane
          : this.lane

    this.obstacles.push({
      id: this.nextId++,
      lane,
      kind,
      required,
      z: 1,
      passed: false,
    })
  }
}
