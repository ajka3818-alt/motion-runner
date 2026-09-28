import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'

const WASM_URL = '/wasm'

const MODEL_URL =
  '/models/pose_landmarker_lite.task'

async function createWithDelegate(
  delegate: 'GPU' | 'CPU',
  vision: Awaited<
    ReturnType<typeof FilesetResolver.forVisionTasks>
  >,
) {
  return PoseLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate,
      },

      runningMode: 'VIDEO',

      numPoses: 1,

      minPoseDetectionConfidence: 0.5,

      minPosePresenceConfidence: 0.5,

      minTrackingConfidence: 0.5,
    },
  )
}

export async function createPoseTracker() {
  console.log(
    'Loading MediaPipe WASM from:',
    WASM_URL,
  )

  const vision =
    await FilesetResolver.forVisionTasks(
      WASM_URL,
    )

  try {
    console.log(
      'Trying MediaPipe GPU...',
    )

    const tracker =
      await createWithDelegate(
        'GPU',
        vision,
      )

    console.log(
      'MediaPipe GPU ready',
    )

    return tracker
  } catch (gpuError) {
    console.warn(
      'GPU failed. Falling back to CPU.',
      gpuError,
    )

    const tracker =
      await createWithDelegate(
        'CPU',
        vision,
      )

    console.log(
      'MediaPipe CPU ready',
    )

    return tracker
  }
}

export type PoseResult =
  PoseLandmarkerResult