export type MotionType =
  | 'CENTER'
  | 'LEFT'
  | 'RIGHT'
  | 'JUMP'
  | 'CROUCH'
  | 'UNKNOWN'

export interface Point3D {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseFrame {
  landmarks: Point3D[]
  timestamp: number
}

export interface CalibrationProfile {
  shoulderWidth: number
  neutralShoulderCenterX: number
  neutralHipY: number
  neutralShoulderY: number
  torsoHeight: number
}

export interface MotionFeedback {
  motion: MotionType
  confidence: number
  isCorrect: boolean
  message: string
  detail?: string
  quality: 'perfect' | 'good' | 'weak' | 'error'
  debug?: Record<string, number>
}
