import { clamp, midpoint, normalize } from './geometry'
import type {
  CalibrationProfile,
  MotionFeedback,
  Point3D,
  PoseFrame,
} from './types'

const L = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
}

const visible = (...points: Point3D[]) =>
  points.every((p) => (p.visibility ?? 1) > 0.45)

export function analyzeMotion(
  frame: PoseFrame,
  calibration: CalibrationProfile,
): MotionFeedback {
  const p = frame.landmarks
  const ls = p[L.leftShoulder]
  const rs = p[L.rightShoulder]
  const lw = p[L.leftWrist]
  const rw = p[L.rightWrist]
  const lh = p[L.leftHip]
  const rh = p[L.rightHip]
  const lk = p[L.leftKnee]
  const rk = p[L.rightKnee]

  if (![ls, rs, lw, rw, lh, rh, lk, rk].every(Boolean)) {
    return {
      motion: 'UNKNOWN',
      confidence: 0,
      isCorrect: false,
      message: 'Денең толық көрінбей тұр',
      detail: 'Камерадан сәл алысырақ тұрып, денеңді толық кадрға сыйғыз.',
      quality: 'error',
    }
  }

  if (!visible(ls, rs, lw, rw, lh, rh)) {
    return {
      motion: 'UNKNOWN',
      confidence: 0.1,
      isCorrect: false,
      message: 'Камера денені анық көрмей тұр',
      detail: 'Жарықты күшейт немесе камераға тура қара.',
      quality: 'error',
    }
  }

  const shoulderCenter = midpoint(ls, rs)
  const hipCenter = midpoint(lh, rh)
  const shoulderWidth = Math.max(calibration.shoulderWidth, 0.05)

  // Horizontal lean is normalized by shoulder width.
  const leanRaw =
    (shoulderCenter.x - calibration.neutralShoulderCenterX) /
    shoulderWidth

  // Both wrists above shoulders -> jump intent.
  const leftRaise =
    (ls.y - lw.y) / Math.max(calibration.torsoHeight, 0.05)
  const rightRaise =
    (rs.y - rw.y) / Math.max(calibration.torsoHeight, 0.05)
  const raiseScore = clamp((Math.min(leftRaise, rightRaise) - 0.05) / 0.55)

  // Hip moved down relative to calibrated stance -> crouch intent.
  const crouchDelta =
    (hipCenter.y - calibration.neutralHipY) /
    Math.max(calibration.torsoHeight, 0.05)
  const crouchScore = clamp((crouchDelta - 0.08) / 0.42)

  const leftLeanScore = normalize(-leanRaw, 0.18, 0.60)
  const rightLeanScore = normalize(leanRaw, 0.18, 0.60)

  const candidates = [
    { type: 'JUMP' as const, score: raiseScore },
    { type: 'CROUCH' as const, score: crouchScore },
    { type: 'LEFT' as const, score: leftLeanScore },
    { type: 'RIGHT' as const, score: rightLeanScore },
  ].sort((a, b) => b.score - a.score)

  const best = candidates[0]

  if (best.score >= 0.76) {
    return {
      motion: best.type,
      confidence: best.score,
      isCorrect: true,
      message:
        best.score >= 0.93
          ? `PERFECT ${label(best.type)}`
          : `${label(best.type)} анықталды`,
      detail: best.score >= 0.93 ? 'Қозғалыс өте дәл орындалды.' : 'Жақсы!',
      quality: best.score >= 0.93 ? 'perfect' : 'good',
      debug: { leanRaw, raiseScore, crouchScore },
    }
  }

  // Near-correct movements power the required "error" mode.
  if (raiseScore >= 0.32) {
    const side =
      leftRaise < rightRaise ? 'сол' : rightRaise < leftRaise ? 'оң' : ''
    return {
      motion: 'JUMP',
      confidence: raiseScore,
      isCorrect: false,
      message: 'Секіру толық емес',
      detail: side
        ? `${side[0].toUpperCase() + side.slice(1)} қолыңды иықтан жоғарырақ көтер.`
        : 'Екі қолыңды да иықтан жоғары көтер.',
      quality: 'weak',
      debug: { leftRaise, rightRaise },
    }
  }

  if (crouchScore >= 0.28) {
    return {
      motion: 'CROUCH',
      confidence: crouchScore,
      isCorrect: false,
      message: 'Отыру жеткіліксіз',
      detail: 'Тізеңді көбірек бүгіп, жамбасыңды төменірек түсір.',
      quality: 'weak',
      debug: { crouchDelta },
    }
  }

  if (leftLeanScore >= 0.26) {
    return {
      motion: 'LEFT',
      confidence: leftLeanScore,
      isCorrect: false,
      message: 'Солға еңкею әлсіз',
      detail: 'Басыңды ғана емес, иығың мен денеңді солға көбірек жылжыт.',
      quality: 'weak',
      debug: { leanRaw },
    }
  }

  if (rightLeanScore >= 0.26) {
    return {
      motion: 'RIGHT',
      confidence: rightLeanScore,
      isCorrect: false,
      message: 'Оңға еңкею әлсіз',
      detail: 'Басыңды ғана емес, иығың мен денеңді оңға көбірек жылжыт.',
      quality: 'weak',
      debug: { leanRaw },
    }
  }

  return {
    motion: 'CENTER',
    confidence: 0.9,
    isCorrect: true,
    message: 'Дайын қалып',
    detail: 'Келесі кедергіні күт.',
    quality: 'good',
    debug: { leanRaw, raiseScore, crouchScore },
  }
}

function label(type: 'JUMP' | 'CROUCH' | 'LEFT' | 'RIGHT') {
  return {
    JUMP: 'СЕКІРУ',
    CROUCH: 'ОТЫРУ',
    LEFT: 'СОЛҒА',
    RIGHT: 'ОҢҒА',
  }[type]
}
