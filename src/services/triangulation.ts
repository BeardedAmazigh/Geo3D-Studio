/**
 * Robust 2D Polygon Triangulation using Ear-Clipping.
 * Returns array of triangle index triplets: [i0, i1, i2, ...]
 */

interface Point2D {
  x: number;
  y: number;
  index: number;
}

function crossProduct(a: Point2D, b: Point2D, c: Point2D): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function isPointInTriangle(
  p: Point2D,
  a: Point2D,
  b: Point2D,
  c: Point2D
): boolean {
  const cp1 = crossProduct(a, b, p);
  const cp2 = crossProduct(b, c, p);
  const cp3 = crossProduct(c, a, p);

  const hasNeg = cp1 < -1e-6 || cp2 < -1e-6 || cp3 < -1e-6;
  const hasPos = cp1 > 1e-6 || cp2 > 1e-6 || cp3 > 1e-6;

  return !(hasNeg && hasPos);
}

function isEar(
  i: number,
  vertices: Point2D[]
): boolean {
  const n = vertices.length;
  const prev = vertices[(i - 1 + n) % n];
  const curr = vertices[i];
  const next = vertices[(i + 1) % n];

  // Must be strictly convex
  if (crossProduct(prev, curr, next) <= 1e-7) {
    return false;
  }

  // Check if any other vertex lies inside this candidate ear triangle
  for (let j = 0; j < n; j++) {
    if (j === (i - 1 + n) % n || j === i || j === (i + 1) % n) continue;
    if (isPointInTriangle(vertices[j], prev, curr, next)) {
      return false;
    }
  }

  return true;
}

export function triangulatePolygon(polygon: [number, number][]): number[] {
  if (polygon.length < 3) return [];
  if (polygon.length === 3) return [0, 1, 2];

  // Remove duplicate closing point if first equals last
  let points = [...polygon];
  const first = points[0];
  const last = points[points.length - 1];
  if (
    points.length > 3 &&
    Math.abs(first[0] - last[0]) < 1e-6 &&
    Math.abs(first[1] - last[1]) < 1e-6
  ) {
    points.pop();
  }

  const n = points.length;
  if (n < 3) return [];

  // Determine winding order (Shoelace area)
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += points[i][0] * points[j][1] - points[j][0] * points[i][1];
  }

  // Ensure Counter-Clockwise (CCW) winding
  const vertices: Point2D[] = [];
  if (signedArea < 0) {
    for (let i = n - 1; i >= 0; i--) {
      vertices.push({ x: points[i][0], y: points[i][1], index: i });
    }
  } else {
    for (let i = 0; i < n; i++) {
      vertices.push({ x: points[i][0], y: points[i][1], index: i });
    }
  }

  const triangles: number[] = [];
  let remaining = [...vertices];
  let bailOut = remaining.length * 3;

  while (remaining.length > 3 && bailOut > 0) {
    bailOut--;
    let earFound = false;

    for (let i = 0; i < remaining.length; i++) {
      if (isEar(i, remaining)) {
        const prev = remaining[(i - 1 + remaining.length) % remaining.length];
        const curr = remaining[i];
        const next = remaining[(i + 1) % remaining.length];

        triangles.push(prev.index, curr.index, next.index);
        remaining.splice(i, 1);
        earFound = true;
        break;
      }
    }

    // Fallback if degenerate polygon or collinear vertices
    if (!earFound && remaining.length > 3) {
      triangles.push(remaining[0].index, remaining[1].index, remaining[2].index);
      remaining.splice(1, 1);
    }
  }

  if (remaining.length === 3) {
    triangles.push(remaining[0].index, remaining[1].index, remaining[2].index);
  }

  return triangles;
}
