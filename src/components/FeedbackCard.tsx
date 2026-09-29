import type {
  MotionFeedback,
} from '../motion/types'

export default function FeedbackCard({
  feedback,
}: {
  feedback: MotionFeedback
}) {
  const pct =
    Math.round(
      feedback.confidence * 100,
    )

  return (
    <section
      className={`coach-card quality-${feedback.quality}`}
    >
      <div className="coach-card-head">
        <span>
          AI COACH FEEDBACK
        </span>

        <strong>
          {feedback.quality.toUpperCase()}
        </strong>
      </div>

      <div className="coach-card-body">
        <div className="coach-ring">
          <strong>
            {pct}%
          </strong>

          <span>
            FORM
          </span>
        </div>

        <div className="coach-copy">
          <span>
            CURRENT POSTURE MOVE
          </span>

          <h3>
            {feedback.message}
          </h3>

          <div className="coach-good">
            ✓ Қимыл анықталды
          </div>

          <div className="coach-fix">
            △ {feedback.detail}
          </div>
        </div>
      </div>
    </section>
  )
}
