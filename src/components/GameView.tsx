import type {
  Lane,
  Obstacle,
} from '../game/types'

type Props = {
  lane: Lane
  obstacles: Obstacle[]
  score: number
  combo: number
  timeLeft: number
  hint: string
}

export default function GameView({
  lane,
  obstacles,
  score,
  combo,
  timeLeft,
  hint,
}: Props) {
  const laneX =
    [18, 50, 82][lane]

  return (
    <section className="game-console">
      <div className="score-row">
        <div>
          <span>
            TOTAL SCORE
          </span>

          <strong>
            {score.toLocaleString()}
          </strong>
        </div>

        <div className="score-badges">
          <b>
            {combo}X COMBO
          </b>

          <b className="streak-badge">
            ◉ {Math.max(combo * 7, 0)} STREAK
          </b>
        </div>
      </div>

      <div className="xp-block">
        <div className="xp-label">
          <span>
            Level Progress
          </span>

          <strong>
            {Math.min(score, 15000).toLocaleString()}
            {' '}
            / 15,000 XP
          </strong>
        </div>

        <div className="xp-track">
          <div
            style={{
              width:
                `${Math.min(
                  100,
                  (score / 15000) * 100,
                )}%`,
            }}
          />
        </div>
      </div>

      <div className="runner-panel">
        <div className="runner-panel-top">
          <div>
            <span>
              ҚИМЫЛ
            </span>

            <strong>
              {hint}
            </strong>
          </div>

          <div>
            <span>
              COMBO
            </span>

            <strong>
              x{combo}
            </strong>
          </div>

          <div>
            <span>
              УАҚЫТ
            </span>

            <strong>
              {Math.ceil(timeLeft)}s
            </strong>
          </div>
        </div>

        <div className="road">
          <div className="road-line line-a" />
          <div className="road-line line-b" />

          {obstacles.map(
            (obstacle) => {
              const x =
                [18, 50, 82][
                  obstacle.lane
                ]

              const y =
                10 +
                (1 - obstacle.z) *
                  73

              const scale =
                0.45 +
                (1 - obstacle.z) *
                  0.9

              return (
                <div
                  key={obstacle.id}
                  className={`obstacle ${obstacle.kind}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform:
                      `translate(-50%, -50%) scale(${scale})`,
                  }}
                >
                  <small>
                    {gestureIcon(
                      obstacle.required,
                    )}
                  </small>
                </div>
              )
            },
          )}

          <div
            className="runner-shadow"
            style={{
              left:
                `${laneX}%`,
            }}
          />

          <div
            className="runner"
            style={{
              left:
                `${laneX}%`,
            }}
          >
            <div className="runner-head" />
            <div className="runner-body" />
            <div className="runner-arms" />
            <div className="runner-legs" />
          </div>
        </div>
      </div>
    </section>
  )
}

function gestureIcon(
  type: string,
) {
  if (type === 'JUMP') {
    return '↑'
  }

  if (type === 'CROUCH') {
    return '↓'
  }

  if (type === 'LEFT') {
    return '←'
  }

  if (type === 'RIGHT') {
    return '→'
  }

  return '•'
}
