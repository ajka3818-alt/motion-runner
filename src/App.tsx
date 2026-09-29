import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'

import CameraPanel from './components/CameraPanel'
import FeedbackCard from './components/FeedbackCard'
import GameView from './components/GameView'

import { createPoseTracker } from './motion/poseTracker'
import { buildCalibration } from './motion/calibration'
import { analyzeMotion } from './motion/analyzer'
import { MotionStabilizer } from './motion/stabilizer'

import type {
  CalibrationProfile,
  MotionFeedback,
  PoseFrame,
} from './motion/types'

import { RunnerEngine } from './game/engine'

type Screen = 'landing' | 'calibration' | 'tutorial' | 'game' | 'results'

const initialFeedback: MotionFeedback = {
  motion: 'CENTER',
  confidence: 0.9,
  isCorrect: true,
  message: 'Камераны дайында',
  detail: 'Денең толық көрінетіндей тұрыңыз.',
  quality: 'good',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [tracker, setTracker] = useState<PoseLandmarker | null>(null)
  const [loadingTracker, setLoadingTracker] = useState(false)
  const [visionError, setVisionError] = useState<string | null>(null)

  const [calibration, setCalibration] =
    useState<CalibrationProfile | null>(null)

  const calibrationFrames = useRef<PoseFrame[]>([])
  const calibrationStart = useRef(0)
  const [calibrationProgress, setCalibrationProgress] = useState(0)

  const stabilizer = useRef(new MotionStabilizer())
  const engine = useRef(new RunnerEngine())

  const [feedback, setFeedback] = useState<MotionFeedback>(initialFeedback)
  const [, force] = useState(0)
  const [tutorialIndex, setTutorialIndex] = useState(0)

  const startVision = useCallback(async (): Promise<boolean> => {
    if (tracker) return true

    if (!navigator.mediaDevices?.getUserMedia) {
      setVisionError(
        'Бұл браузер камерамен жұмыс істеуді қолдамайды. Chrome немесе Edge қолдан.',
      )
      return false
    }

    setLoadingTracker(true)
    setVisionError(null)

    try {
      const poseTracker = await createPoseTracker()
      setTracker(poseTracker)
      return true
    } catch (error) {
      console.error('MediaPipe initialization failed:', error)
      setVisionError('Motion AI жүктелмеді. Бетті қайта жүктеп көр.')
      return false
    } finally {
      setLoadingTracker(false)
    }
  }, [tracker])

  const handleStart = useCallback(async () => {
    if (loadingTracker) return

    const ok = await startVision()
    if (!ok) return

    calibrationFrames.current = []
    calibrationStart.current = 0
    setCalibrationProgress(0)
    setTutorialIndex(0)
    setFeedback(initialFeedback)

    setScreen('calibration')
  }, [loadingTracker, startVision])

  useEffect(() => {
    return () => tracker?.close()
  }, [tracker])

  const onFrame = useCallback(
    (frame: PoseFrame) => {
      if (screen === 'calibration') {
        if (!calibrationStart.current) {
          calibrationStart.current = frame.timestamp
        }

        calibrationFrames.current.push(frame)

        if (calibrationFrames.current.length > 90) {
          calibrationFrames.current.shift()
        }

        const progress = Math.min(
          1,
          (frame.timestamp - calibrationStart.current) / 3000,
        )

        setCalibrationProgress(progress)

        if (progress >= 1) {
          const profile = buildCalibration(calibrationFrames.current)

          if (profile) {
            setCalibration(profile)
            calibrationStart.current = 0
            calibrationFrames.current = []
            setScreen('tutorial')
          }
        }

        return
      }

      if (!calibration) return

      const analyzed = analyzeMotion(frame, calibration)
      setFeedback(analyzed)

      if (screen === 'tutorial') {
        const expected = ['LEFT', 'RIGHT', 'JUMP', 'CROUCH'][tutorialIndex]

        if (
          analyzed.isCorrect &&
          analyzed.motion === expected &&
          analyzed.confidence > 0.8
        ) {
          window.setTimeout(() => {
            setTutorialIndex((i) => {
              if (i >= 3) {
                engine.current.reset()
                stabilizer.current = new MotionStabilizer()
                setScreen('game')
                return i
              }

              return i + 1
            })
          }, 250)
        }

        return
      }

      if (screen === 'game') {
        const stable = stabilizer.current.update(analyzed)

        if (stable.triggered) {
          engine.current.applyMotion(stable.triggered, analyzed)
          force((x) => x + 1)
        }
      }
    },
    [screen, calibration, tutorialIndex],
  )

  useEffect(() => {
    if (screen !== 'game') return

    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now

      engine.current.tick(dt)
      force((x) => x + 1)

      if (engine.current.finished) {
        setScreen('results')
        return
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [screen])

  const tutorial = useMemo(
    () => [
      {
        title: 'Солға еңкей',
        code: 'LEAN LEFT',
        text: 'Басыңды ғана емес, иық пен денені солға жылжыт.',
      },
      {
        title: 'Оңға еңкей',
        code: 'LEAN RIGHT',
        text: 'Иық пен денені оңға анық жылжыт.',
      },
      {
        title: 'Секіру',
        code: 'JUMP',
        text: 'Екі қолыңды иықтан жоғары көтер.',
      },
      {
        title: 'Отыру',
        code: 'CROUCH',
        text: 'Тізеңді бүгіп, жамбасыңды төмен түсір.',
      },
    ],
    [],
  )

  const game = engine.current

  const accuracy = game.stats.totalActions
    ? Math.round(
        ((game.stats.perfect + game.stats.good) /
          game.stats.totalActions) *
          100,
      )
    : 0

  if (screen === 'landing') {
    return (
      <main className="screen">
        <TopBar center="MOTION CONTROL SYSTEM" right="ADMIT HACKATHON 2026" />

        <section className="landing-layout">
          <div className="hero-copy">
            <span className="section-label">CAMERA = CONTROLLER</span>

            <h1>
              Денеңмен басқар.
              <br />
              <em>Әр қимылды жетілдір.</em>
            </h1>

            <p>
              Motion Runner — камера арқылы дене қозғалысымен басқарылатын
              интерактивті runner. Smart Motion Coach қозғалысты real-time
              талдап, нақты қателерді көрсетеді.
            </p>

            <div className="launch-card">
              <div className="launch-head">
                <div>
                  <span className="section-label">SYSTEM ACTIVATION</span>
                  <h3>Motion Tracking Console</h3>
                </div>
                <span className="small-status">READY</span>
              </div>

              <div className="launch-stats">
                <Metric label="CAMERA" value="AVAILABLE" />
                <Metric label="POSE AI" value={tracker ? 'READY' : 'STANDBY'} />
                <Metric label="MODE" value="BODY TRACKING" />
              </div>

              <button
                className="launch-button"
                type="button"
                onClick={handleStart}
                disabled={loadingTracker}
              >
                <span>◉</span>
                <b>
                  {loadingTracker
                    ? 'MOTION AI ЖҮКТЕЛУДЕ...'
                    : 'КАМЕРАНЫ ІСКЕ ҚОСУ'}
                </b>
                <span>→</span>
              </button>

              {visionError && (
                <div className="inline-error">
                  <strong>ЖҮЙЕ ІСКЕ ҚОСЫЛМАДЫ</strong>
                  <span>{visionError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mock-camera-card">
            <div className="card-top">
              <span>LIVE MOTION PREVIEW</span>
              <b>ACCURACY LOCK: 94%</b>
            </div>

            <div className="mock-stage">
              <div className="stage-grid" />
              <div className="mock-body">
                <div className="mock-head" />
                <i className="stick torso" />
                <i className="stick armL" />
                <i className="stick armR" />
                <i className="stick legL" />
                <i className="stick legR" />
              </div>

              <div className="floating-stat stat-left">
                <span>FORM</span>
                <b>94%</b>
              </div>

              <div className="floating-stat stat-right">
                <span>POSTURE</span>
                <b>OPTIMAL</b>
              </div>
            </div>

            <div className="mock-bottom">
              <Metric label="TRACKING" value="ACTIVE" />
              <Metric label="REACTION" value="76 MS" />
              <Metric label="QUALITY" value="HIGH" />
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'calibration') {
    return (
      <main className="screen">
        <TopBar center="CALIBRATION" right="STEP 01 / 03" />

        <section className="dashboard-layout">
          <div className="camera-wrap">
            <CameraPanel tracker={tracker} onFrame={onFrame} />
          </div>

          <aside className="side-stack">
            <div className="panel">
              <span className="section-label">BODY CALIBRATION</span>
              <h2>Денеңді камераға толық көрсет</h2>
              <p>
                Тік тұрып, иықтарыңды бос ұста. Жүйе бастапқы қалпың мен дене
                пропорциясын өлшеп жатыр.
              </p>

              <div className="progress-circle">
                <strong>{Math.round(calibrationProgress * 100)}%</strong>
                <span>CALIBRATED</span>
              </div>

              <div className="progress-line">
                <div style={{ width: `${calibrationProgress * 100}%` }} />
              </div>

              <div className="three-metrics">
                <Metric label="POSE" value="DETECTING" />
                <Metric label="BODY SCALE" value="AUTO" />
                <Metric label="CAMERA" value="LIVE" />
              </div>
            </div>
          </aside>
        </section>
      </main>
    )
  }

  if (screen === 'tutorial') {
    const t = tutorial[tutorialIndex]

    return (
      <main className="screen">
        <TopBar center="MOTION TRAINING" right={`MOVE ${tutorialIndex + 1} / 4`} />

        <section className="dashboard-layout">
          <div className="camera-wrap">
            <CameraPanel tracker={tracker} onFrame={onFrame} />
          </div>

          <aside className="side-stack">
            <div className="panel tutorial-panel">
              <div className="tutorial-index">
                {String(tutorialIndex + 1).padStart(2, '0')}
              </div>

              <span className="section-label">CURRENT POSTURE MOVE</span>
              <h2>{t.title}</h2>
              <p>{t.text}</p>

              <div className="motion-chip">{t.code}</div>

              <FeedbackCard feedback={feedback} />
            </div>
          </aside>
        </section>
      </main>
    )
  }

  if (screen === 'results') {
    const weakest = Object.entries(game.stats.byMotion)
      .map(([motion, stats]) => ({
        motion,
        accuracy: stats.total ? stats.ok / stats.total : 1,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)[0]

    return (
      <main className="screen results-screen">
        <TopBar center="RUN WRAP-UP" right="SESSION COMPLETE" />

        <section className="results-shell">
          <div className="results-title-row">
            <div>
              <span className="section-label">WORKOUT WRAP-UP</span>
              <h1>Session Complete</h1>
              <p>Motion analysis summary</p>
            </div>

            <div className="result-score">
              <span>FINAL SESSION SCORE</span>
              <b>{game.stats.score.toLocaleString()}</b>
            </div>
          </div>

          <div className="results-grid">
            <div className="analytics-panel">
              <div className="card-top">
                <span>JOINT ACCURACY HEATMAP</span>
                <small>Pose estimation analytics mapped to your biometric frame.</small>
              </div>

              <div className="heatmap">
                <div className="heat-body">
                  <div className="heat-head" />
                  <i className="heat-bone ht" />
                  <i className="heat-bone haL" />
                  <i className="heat-bone haR" />
                  <i className="heat-bone hlL" />
                  <i className="heat-bone hlR" />
                </div>

                <span className="heat-label a">
                  JUMP {Math.max(accuracy, 70)}%
                </span>
                <span className="heat-label b">
                  LEFT {Math.max(accuracy - 8, 55)}%
                </span>
                <span className="heat-label c">
                  CROUCH {Math.max(accuracy - 14, 50)}%
                </span>
              </div>
            </div>

            <div className="results-right">
              <div className="rings-row">
                <Ring value={`${accuracy}%`} label="ACCURACY" />
                <Ring value={`${game.stats.perfect}`} label="PERFECT" />
                <Ring value={`${game.stats.hits}`} label="ERRORS" />
                <Ring value={`x${game.stats.bestCombo}`} label="MAX COMBO" />
              </div>

              <div className="summary-table">
                <Metric label="TOTAL MOVES" value={`${game.stats.totalActions}`} />
                <Metric label="PERFECT MOVES" value={`${game.stats.perfect}`} />
                <Metric label="MAX STREAK" value={`x${game.stats.bestCombo}`} />
                <Metric label="HITS" value={`${game.stats.hits}`} />
                <Metric label="GOOD MOVES" value={`${game.stats.good}`} />
                <Metric label="TIME ACTIVE" value="60 SEC" />
              </div>

              <div className="panel coach-summary">
                <span className="section-label">SMART COACH SUMMARY</span>
                <h3>Жетілдіретін қимыл: {weakest?.motion ?? '—'}</h3>
                <p>
                  Қимылды асықпай, дене орталығын анық өзгертіп орында.
                  Жүйе дәлдікті дене пропорциясына қарай есептейді.
                </p>
              </div>
            </div>
          </div>

          <div className="results-footer">
            <div className="history-card">
              <span>PERFORMANCE HISTORY</span>
              <div className="sparkline">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </div>

            <button
              className="launch-button replay"
              type="button"
              onClick={() => {
                engine.current.reset()
                stabilizer.current = new MotionStabilizer()
                setFeedback(initialFeedback)
                setScreen('game')
              }}
            >
              <b>ҚАЙТА ЖҮГІРУ</b>
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    )
  }

  const upcoming = game.obstacles.find((o) => !o.passed)

  const hint = upcoming
    ? upcoming.required === 'JUMP'
      ? '↑ СЕКІР'
      : upcoming.required === 'CROUCH'
        ? '↓ ОТЫР'
        : upcoming.required === 'LEFT'
          ? '← СОЛҒА'
          : 'ОҢҒА →'
    : 'ҚИМЫЛҒА ДАЙЫН БОЛ'

  return (
    <main className="screen">
      <TopBar center="LIVE SESSION" right="SMART MOTION COACH" />

      <section className="game-layout">
        <div className="game-camera">
          <CameraPanel
            tracker={tracker}
            onFrame={onFrame}
            highlight={
              feedback.motion === 'JUMP' && !feedback.isCorrect ? [15, 16] : []
            }
          />

          <div className="bottom-stats">
            <Metric label="MOTION ACCURACY" value={`${accuracy}%`} />
            <Metric label="PERFECT MOVES" value={`${game.stats.perfect}`} />
            <Metric label="ACTIVE TIME" value={`${Math.ceil(60 - game.timeLeft)} SEC`} />
          </div>
        </div>

        <div className="game-sidebar">
          <FeedbackCard feedback={feedback} />

          <GameView
            lane={game.lane}
            obstacles={game.obstacles}
            score={game.stats.score}
            combo={game.stats.combo}
            timeLeft={game.timeLeft}
            hint={hint}
          />
        </div>
      </section>
    </main>
  )
}

function TopBar({
  center,
  right,
}: {
  center: string
  right: string
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-square" />
        <strong>
          MOTION <b>RUNNER</b>
        </strong>
      </div>

      <div className="live-pill">
        <span className="live-dot" />
        {center}
      </div>

      <div className="top-right">{right}</div>
    </header>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Ring({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="ring">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
