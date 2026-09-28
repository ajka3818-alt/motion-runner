import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  PoseLandmarker,
} from '@mediapipe/tasks-vision'

import type {
  PoseFrame,
} from '../motion/types'

type Props = {
  tracker: PoseLandmarker | null
  onFrame: (frame: PoseFrame) => void
  highlight?: number[]
}

const CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
] as const

const DRAW_LANDMARKS = [
  11,
  12,
  13,
  14,
  15,
  16,
  23,
  24,
  25,
  26,
  27,
  28,
]

export default function CameraPanel({
  tracker,
  onFrame,
  highlight = [],
}: Props) {
  const videoRef =
    useRef<HTMLVideoElement>(null)

  const canvasRef =
    useRef<HTMLCanvasElement>(null)

  const rafRef =
    useRef<number | null>(null)

  /**
   * Маңызды:
   * onFrame өзгерген сайын камераны қайта іске қоспау үшін
   * callback-ты ref ішінде сақтаймыз.
   */
  const onFrameRef =
    useRef(onFrame)

  /**
   * highlight массиві өзгерген сайын да
   * камера қайта ашылмауы керек.
   */
  const highlightRef =
    useRef<number[]>(highlight)

  const [error, setError] =
    useState<string | null>(null)

  /**
   * Жаңа callback келгенде тек ref жаңартылады.
   * Камера effect қайта іске қосылмайды.
   */
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  /**
   * Highlight үшін де дәл солай.
   */
  useEffect(() => {
    highlightRef.current = highlight
  }, [highlight])

  /**
   * Камера тек tracker өзгерген кезде ғана
   * іске қосылады немесе тоқтайды.
   */
  useEffect(() => {
    if (!tracker) {
      return
    }

    let stream: MediaStream | null = null

    let alive = true

    let previousVideoTime = -1

    async function startCamera() {
      try {
        setError(null)

        console.log(
          'Starting webcam...',
        )

        /**
         * Desktop USB webcam үшін video:true
         * ең тұрақты fallback.
         */
        stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              width: {
                ideal: 1280,
              },

              height: {
                ideal: 720,
              },
            },

            audio: false,
          })

        if (
          !alive ||
          !videoRef.current
        ) {
          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop(),
            )

          return
        }

        const video =
          videoRef.current

        video.srcObject =
          stream

        video.muted = true

        video.playsInline = true

        await video.play()

        console.log(
          'Webcam started successfully',
        )

        const loop = () => {
          if (!alive) {
            return
          }

          const currentVideo =
            videoRef.current

          const canvas =
            canvasRef.current

          /**
           * Бір frame-ды бірнеше рет MediaPipe-қа
           * жібермеу үшін currentTime тексереміз.
           */
          if (
            currentVideo &&
            canvas &&
            currentVideo.readyState >= 2 &&
            currentVideo.videoWidth > 0 &&
            currentVideo.videoHeight > 0 &&
            currentVideo.currentTime !==
              previousVideoTime
          ) {
            previousVideoTime =
              currentVideo.currentTime

            try {
              const now =
                performance.now()

              const result =
                tracker.detectForVideo(
                  currentVideo,
                  now,
                )

              const landmarks =
                result.landmarks?.[0]

              /**
               * Canvas өлшемін тек қажет болса жаңартамыз.
               * Әр frame сайын canvas.width өзгерту flicker
               * тудыруы мүмкін.
               */
              if (
                canvas.width !==
                  currentVideo.videoWidth ||
                canvas.height !==
                  currentVideo.videoHeight
              ) {
                canvas.width =
                  currentVideo.videoWidth

                canvas.height =
                  currentVideo.videoHeight
              }

              const ctx =
                canvas.getContext('2d')

              if (ctx) {
                ctx.clearRect(
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                )

                if (landmarks) {
                  ctx.lineWidth = 4

                  ctx.strokeStyle =
                    'rgba(98, 180, 255, .8)'

                  /**
                   * Skeleton connections.
                   */
                  for (
                    const [a, b]
                    of CONNECTIONS
                  ) {
                    const pa =
                      landmarks[a]

                    const pb =
                      landmarks[b]

                    if (!pa || !pb) {
                      continue
                    }

                    ctx.beginPath()

                    ctx.moveTo(
                      pa.x *
                        canvas.width,
                      pa.y *
                        canvas.height,
                    )

                    ctx.lineTo(
                      pb.x *
                        canvas.width,
                      pb.y *
                        canvas.height,
                    )

                    ctx.stroke()
                  }

                  /**
                   * Landmark circles.
                   */
                  landmarks.forEach(
                    (point, index) => {
                      if (
                        !DRAW_LANDMARKS.includes(
                          index,
                        )
                      ) {
                        return
                      }

                      const highlighted =
                        highlightRef.current.includes(
                          index,
                        )

                      ctx.beginPath()

                      ctx.arc(
                        point.x *
                          canvas.width,
                        point.y *
                          canvas.height,
                        highlighted
                          ? 9
                          : 6,
                        0,
                        Math.PI * 2,
                      )

                      ctx.fillStyle =
                        highlighted
                          ? '#ffb65c'
                          : '#d9f3ff'

                      ctx.fill()
                    },
                  )

                  /**
                   * Ең соңғы App.tsx callback-ты қолданамыз.
                   */
                  onFrameRef.current({
                    landmarks,
                    timestamp: now,
                  })
                }
              }
            } catch (
              detectionError
            ) {
              console.error(
                'Pose detection error:',
                detectionError,
              )
            }
          }

          rafRef.current =
            requestAnimationFrame(
              loop,
            )
        }

        loop()
      } catch (cameraError) {
        console.error(
          'CAMERA ERROR:',
          cameraError,
        )

        if (
          cameraError instanceof
          DOMException
        ) {
          if (
            cameraError.name ===
            'NotAllowedError'
          ) {
            setError(
              'Камераға рұқсат берілмеді. Chrome параметрлерінен камераға рұқсат бер.',
            )
          } else if (
            cameraError.name ===
            'NotFoundError'
          ) {
            setError(
              'Камера табылмады. Камераның қосылғанын тексер.',
            )
          } else if (
            cameraError.name ===
            'NotReadableError'
          ) {
            setError(
              'Камераны басқа бағдарлама пайдаланып жатыр. Zoom, Telegram, Discord немесе Camera қолданбасын жап.',
            )
          } else {
            setError(
              `${cameraError.name}: ${cameraError.message}`,
            )
          }
        } else {
          setError(
            'Камераны іске қосу кезінде белгісіз қате пайда болды.',
          )
        }
      }
    }

    void startCamera()

    /**
     * CameraPanel шынымен жабылғанда
     * немесе tracker өзгергенде ғана cleanup.
     */
    return () => {
      console.log(
        'Stopping webcam...',
      )

      alive = false

      if (
        rafRef.current !== null
      ) {
        cancelAnimationFrame(
          rafRef.current,
        )

        rafRef.current = null
      }

      if (stream) {
        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop(),
          )
      }

      if (
        videoRef.current
      ) {
        videoRef.current.srcObject =
          null
      }
    }
  }, [tracker])

  return (
    <div className="camera-shell">
      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        playsInline
        muted
      />

      <canvas
        ref={canvasRef}
        className="camera-overlay"
      />

      <div className="camera-badge">
        <span className="live-dot" />

        LIVE MOTION
      </div>

      {error && (
        <div className="camera-error">
          {error}
        </div>
      )}
    </div>
  )
}
