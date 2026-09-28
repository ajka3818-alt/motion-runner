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

  const [feedback, setFeedback] =
    useState<MotionFeedback>(initialFeedback)

  const [, force] = useState(0)

  const [tutorialIndex, setTutorialIndex] = useState(0)

  /**
   * MediaPipe Pose моделін жүктейді.
   * Қате болса landing page-те нақты хабар көрсетіледі.
   */
  const startVision = useCallback(async (): Promise<boolean> => {
    if (tracker) {
      return true
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setVisionError(
        'Бұл браузер камерамен жұмыс істеуді қолдамайды. Chrome немесе Edge браузерін қолданып көр.',
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

      setVisionError(
        'Motion AI жүктелмеді. Интернетті тексер, Chrome-да ашып көр және бетті қайта жүкте.',
      )

      return false
    } finally {
      setLoadingTracker(false)
    }
  }, [tracker])

  /**
   * Landing page-тегі "Камераны қосу" батырмасы.
   */
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

  /**
   * MediaPipe ресурстарын component жабылған кезде босату.
   */
  useEffect(() => {
    return () => {
      tracker?.close()
    }
  }, [tracker])

  /**
   * CameraPanel әр frame сайын осы функцияны шақырады.
   */
  const onFrame = useCallback(
    (frame: PoseFrame) => {
      /**
       * 1. Calibration
       */
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

      if (!calibration) {
        return
      }

      /**
       * 2. Motion analysis
       */
      const analyzed = analyzeMotion(frame, calibration)

      setFeedback(analyzed)

      /**
       * 3. Tutorial
       */
      if (screen === 'tutorial') {
        const expected = ['LEFT', 'RIGHT', 'JUMP', 'CROUCH'][tutorialIndex]

        if (
          analyzed.isCorrect &&
          analyzed.motion === expected &&
          analyzed.confidence > 0.8
        ) {
          window.setTimeout(() => {
            setTutorialIndex((currentIndex) => {
              if (currentIndex >= 3) {
                engine.current.reset()
                stabilizer.current = new MotionStabilizer()
                setScreen('game')

                return currentIndex
              }

              return currentIndex + 1
            })
          }, 250)
        }

        return
      }

      /**
       * 4. Game
       */
      if (screen === 'game') {
        const stable = stabilizer.current.update(analyzed)

        if (stable.triggered) {
          engine.current.applyMotion(stable.triggered, analyzed)

          force((value) => value + 1)
        }
      }
    },
    [screen, calibration, tutorialIndex],
  )

  /**
   * Game loop.
   */
  useEffect(() => {
    if (screen !== 'game') {
      return
    }

    let animationFrame = 0
    let lastTime = performance.now()

    const loop = (now: number) => {
      const delta = Math.min(50, now - lastTime)

      lastTime = now

      engine.current.tick(delta)

      force((value) => value + 1)

      if (engine.current.finished) {
        setScreen('results')
        return
      }

      animationFrame = requestAnimationFrame(loop)
    }

    animationFrame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [screen])

  /**
   * Tutorial қимылдары.
   */
  const tutorial = useMemo(
    () => [
      {
        title: 'Солға еңкей',
        icon: '←',
        text: 'Басыңды ғана емес, иық пен денені солға жылжыт.',
      },
      {
        title: 'Оңға еңкей',
        icon: '→',
        text: 'Денеңді оңға жеткілікті деңгейде еңкейт.',
      },
      {
        title: 'Секіру',
        icon: '🙌',
        text: 'Екі қолыңды иықтан жоғары көтер.',
      },
      {
        title: 'Отыру',
        icon: '⬇',
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

  /**
   * LANDING
   */
  if (screen === 'landing') {
    return (
      <main className="landing">
        <nav className="nav">
          <div className="brand-mark">MR</div>

          <strong>MOTION RUNNER</strong>

          <span className="nav-pill">
            ADMIT HACKATHON
          </span>
        </nav>

        <section className="hero">
          <div className="hero-copy">
            <span className="hero-kicker">
              CAMERA = CONTROLLER
            </span>

            <h1>
              Денеңмен басқар.
              <br />
              <em>Әр қимылды жетілдір.</em>
            </h1>

            <p>
              Пернетақтасыз және тышқансыз жүгіру ойыны.
              Smart Motion Coach тек қозғалысты танымайды —
              оны қаншалықты дұрыс орындағаныңды да көрсетеді.
            </p>

            <button
              type="button"
              className="primary-btn"
              onClick={handleStart}
              disabled={loadingTracker}
            >
              {loadingTracker
                ? 'MOTION AI ЖҮКТЕЛУДЕ…'
                : 'КАМЕРАНЫ ҚОСУ →'}
            </button>

            {loadingTracker && (
              <p
                style={{
                  marginTop: 12,
                  color: '#8da5cf',
                  fontSize: 14,
                }}
              >
                MediaPipe моделі жүктеліп жатыр. Бірнеше секунд күте тұр…
              </p>
            )}

            {visionError && (
              <div
                style={{
                  marginTop: 16,
                  maxWidth: 620,
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1px solid rgba(255, 159, 118, .35)',
                  background: 'rgba(255, 159, 118, .08)',
                  color: '#ffbd9f',
                  lineHeight: 1.5,
                }}
              >
                <strong>Камера жүйесін іске қосу мүмкін болмады.</strong>

                <div style={{ marginTop: 6 }}>
                  {visionError}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVisionError(null)
                    void handleStart()
                  }}
                  style={{
                    marginTop: 12,
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,.15)',
                    background: 'rgba(255,255,255,.06)',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  ҚАЙТА КӨРУ
                </button>
              </div>
            )}

            <div className="trust-row">
              <span>⚡ Real-time</span>

              <span>🔒 Local processing</span>

              <span>🧠 Smart Error Coach</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="scan-grid" />

            <div className="pose-demo">
              <div className="pose-head" />

              <div className="pose-line torso" />

              <div className="pose-line arm-left" />

              <div className="pose-line arm-right" />

              <div className="pose-line leg-left" />

              <div className="pose-line leg-right" />
            </div>

            <div className="hero-stat top-left">
              <span>JUMP</span>

              <strong>94%</strong>
            </div>

            <div className="hero-stat bottom-right">
              <span>FORM</span>

              <strong>PERFECT</strong>
            </div>
          </div>
        </section>
      </main>
    )
  }

  /**
   * CALIBRATION
   */
  if (screen === 'calibration') {
    return (
      <main className="app-shell">
        <header className="app-header">
          <div className="brand-mark">MR</div>

          <strong>MOTION RUNNER</strong>

          <span className="step-pill">
            КАЛИБРЛЕУ
          </span>
        </header>

        <section className="split-screen">
          <CameraPanel
            tracker={tracker}
            onFrame={onFrame}
          />

          <div className="setup-card">
            <span className="eyebrow">
              01 / КАЛИБРЛЕУ
            </span>

            <h2>
              Денеңді камераға толық көрсет
            </h2>

            <p>
              Тік тұрып, иықтарыңды бос ұста.
              Біз сенің бастапқы қалпыңды өлшеп жатырмыз.
            </p>

            <div className="calibration-ring">
              <strong>
                {Math.round(calibrationProgress * 100)}%
              </strong>
            </div>

            <div className="meter large">
              <div
                style={{
                  width: `${calibrationProgress * 100}%`,
                }}
              />
            </div>

            <small>
              Калибрлеу әр адамның бойы мен камера қашықтығына бейімделеді.
            </small>
          </div>
        </section>
      </main>
    )
  }

  /**
   * TUTORIAL
   */
  if (screen === 'tutorial') {
    const currentTutorial = tutorial[tutorialIndex]

    return (
      <main className="app-shell">
        <header className="app-header">
          <div className="brand-mark">MR</div>

          <strong>MOTION RUNNER</strong>

          <span className="step-pill">
            ЖАТТЫҒУ {tutorialIndex + 1}/4
          </span>
        </header>

        <section className="split-screen">
          <CameraPanel
            tracker={tracker}
            onFrame={onFrame}
          />

          <div className="setup-card tutorial-card">
            <span className="gesture-icon">
              {currentTutorial.icon}
            </span>

            <span className="eyebrow">
              ҚИМЫЛДЫ ҚАЙТАЛА
            </span>

            <h2>
              {currentTutorial.title}
            </h2>

            <p>
              {currentTutorial.text}
            </p>

            <FeedbackCard feedback={feedback} />
          </div>
        </section>
      </main>
    )
  }

  /**
   * RESULTS
   */
  if (screen === 'results') {
    const weakest = Object.entries(game.stats.byMotion)
      .map(([motion, stats]) => ({
        motion,
        accuracy:
          stats.total > 0
            ? stats.ok / stats.total
            : 1,
      }))
      .sort(
        (a, b) =>
          a.accuracy - b.accuracy,
      )[0]

    return (
      <main className="results-page">
        <div className="results-card">
          <span className="eyebrow">
            RUN COMPLETE
          </span>

          <h1>
            {game.stats.score.toLocaleString()}
          </h1>

          <p className="muted">
            FINAL SCORE
          </p>

          <div className="results-grid">
            <div>
              <span>
                ҚИМЫЛ ДӘЛДІГІ
              </span>

              <strong>
                {accuracy}%
              </strong>
            </div>

            <div>
              <span>
                PERFECT
              </span>

              <strong>
                {game.stats.perfect}
              </strong>
            </div>

            <div>
              <span>
                ҚАТЕЛЕР
              </span>

              <strong>
                {game.stats.hits}
              </strong>
            </div>

            <div>
              <span>
                BEST COMBO
              </span>

              <strong>
                x{game.stats.bestCombo}
              </strong>
            </div>
          </div>

          <div className="coach-summary">
            <span className="eyebrow">
              SMART COACH SUMMARY
            </span>

            <h3>
              Жетілдіретін қимыл:{' '}
              {weakest?.motion ?? '—'}
            </h3>

            <p>
              Қимылды асықпай, дене орталығын анық өзгертіп орында.
              Жүйе дәлдікті дене пропорциясына қарай есептейді.
            </p>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              engine.current.reset()

              stabilizer.current =
                new MotionStabilizer()

              setFeedback(initialFeedback)

              setScreen('game')
            }}
          >
            ҚАЙТА ЖҮГІРУ →
          </button>
        </div>
      </main>
    )
  }

  /**
   * GAME
   */
  const upcoming =
    game.obstacles.find(
      (obstacle) =>
        !obstacle.passed,
    )

  const hint = upcoming
    ? upcoming.required === 'JUMP'
      ? '🙌 СЕКІР'
      : upcoming.required === 'CROUCH'
        ? '⬇ ОТЫР'
        : upcoming.required === 'LEFT'
          ? '← СОЛҒА'
          : 'ОҢҒА →'
    : 'ҚИМЫЛҒА ДАЙЫН БОЛ'

  return (
    <main className="app-shell game-page">
      <header className="app-header">
        <div className="brand-mark">MR</div>

        <strong>MOTION RUNNER</strong>

        <span className="step-pill green">
          LIVE RUN
        </span>
      </header>

      <section className="game-layout">
        <div className="left-stack">
          <CameraPanel
            tracker={tracker}
            onFrame={onFrame}
            highlight={
              feedback.motion === 'JUMP' &&
              !feedback.isCorrect
                ? [15, 16]
                : []
            }
          />

          <FeedbackCard
            feedback={feedback}
          />
        </div>

        <GameView
          lane={game.lane}
          obstacles={game.obstacles}
          score={game.stats.score}
          combo={game.stats.combo}
          timeLeft={game.timeLeft}
          hint={hint}
        />
      </section>
    </main>
  )
}
