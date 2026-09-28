import { distance2D, midpoint } from './geometry'
import type { CalibrationProfile, PoseFrame } from './types'

const L = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
}

export function buildCalibration(frames: PoseFrame[]): CalibrationProfile | null {
  if (!frames.length) return null

  const metrics = frames.map(({ landmarks }) => {
    const ls = landmarks[L.leftShoulder]
    const rs = landmarks[L.rightShoulder]
    const lh = landmarks[L.leftHip]
    const rh = landmarks[L.rightHip]
    if (!ls || !rs || !lh || !rh) return null

    const shoulderCenter = midpoint(ls, rs)
    const hipCenter = midpoint(lh, rh)

    return {
      shoulderWidth: distance2D(ls, rs),
      neutralShoulderCenterX: shoulderCenter.x,
      neutralHipY: hipCenter.y,
      neutralShoulderY: shoulderCenter.y,
      torsoHeight: Math.max(0.05, hipCenter.y - shoulderCenter.y),
    }
  }).filter(Boolean) as CalibrationProfile[]

  if (!metrics.length) return null

  const avg = (key: keyof CalibrationProfile) =>
    metrics.reduce((sum, m) => sum + m[key], 0) / metrics.length

  return {
    shoulderWidth: avg('shoulderWidth'),
    neutralShoulderCenterX: avg('neutralShoulderCenterX'),
    neutralHipY: avg('neutralHipY'),
    neutralShoulderY: avg('neutralShoulderY'),
    torsoHeight: avg('torsoHeight'),
  }
}
