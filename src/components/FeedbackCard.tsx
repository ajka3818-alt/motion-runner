import type { MotionFeedback } from '../motion/types'

export default function FeedbackCard({ feedback }: { feedback: MotionFeedback }) {
  const pct = Math.round(feedback.confidence * 100)
  return (
    <div className={`feedback-card quality-${feedback.quality}`}>
      <div className="feedback-head">
        <div>
          <span className="eyebrow">SMART MOTION COACH</span>
          <h3>{feedback.message}</h3>
        </div>
        <strong>{pct}%</strong>
      </div>
      <div className="meter">
        <div style={{ width: `${pct}%` }} />
      </div>
      <p>{feedback.detail}</p>
    </div>
  )
}
