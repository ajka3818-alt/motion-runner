import type { Point3D } from './types'

export const distance2D = (a: Point3D, b: Point3D) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const midpoint = (a: Point3D, b: Point3D): Point3D => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
})

export const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value))

export const normalize = (
  value: number,
  min: number,
  max: number,
) => clamp((value - min) / Math.max(0.0001, max - min))
