import type { Lane, Obstacle } from '../game/types'

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
  const laneX = [18, 50, 82][lane]
  return (
    <div className="game">
      <div className="game-topbar">
        <div><span>ҰПАЙ</span><strong>{score.toLocaleString()}</strong></div>
        <div><span>COMBO</span><strong>x{combo}</strong></div>
        <div><span>УАҚЫТ</span><strong>{Math.ceil(timeLeft)}s</strong></div>
      </div>

      <div className="road">
        <div className="road-line line-a" />
        <div className="road-line line-b" />
        {obstacles.map((o) => {
          const x = [18, 50, 82][o.lane]
          const y = 10 + (1 - o.z) * 73
          const scale = 0.45 + (1 - o.z) * 0.9
          return (
            <div
              key={o.id}
              className={`obstacle ${o.kind}`}
              style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${scale})` }}
            >
              <small>{gestureIcon(o.required)}</small>
            </div>
          )
        })}
        <div className="runner-shadow" style={{ left: `${laneX}%` }} />
        <div className="runner" style={{ left: `${laneX}%` }}>
          <div className="runner-head" />
          <div className="runner-body" />
          <div className="runner-arms" />
          <div className="runner-legs" />
        </div>
      </div>

      <div className="next-hint">{hint}</div>
    </div>
  )
}

function gestureIcon(type: string) {
  if (type === 'JUMP') return '🙌'
  if (type === 'CROUCH') return '⬇'
  if (type === 'LEFT') return '←'
  if (type === 'RIGHT') return '→'
  return '•'
}
