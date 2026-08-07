import { describe, expect, it } from "vitest";
import type { GpsPoint } from "@/types";
import { acceptFix, decodeTrack, encodeTrack, haversineMiles, simplifyTrack } from "../geo";

const METERS_PER_MILE = 1609.344;

describe("haversineMiles", () => {
  it("is zero for a point against itself", () => {
    expect(haversineMiles({ lat: 37.5407, lng: -77.436 }, { lat: 37.5407, lng: -77.436 })).toBe(0);
  });

  it("matches the exact meridian-arc distance for a pure change in latitude", () => {
    // With dLng = 0, haversine reduces exactly to R * dLat(radians) — no
    // approximation involved, so this is an exact check, not a fuzzy one.
    const R = 3958.7613;
    const dLatDeg = 1;
    const expected = R * (dLatDeg * Math.PI) / 180;
    const dist = haversineMiles({ lat: 36.0, lng: -77.0 }, { lat: 37.0, lng: -77.0 });
    expect(dist).toBeCloseTo(expected, 6);
  });

  it("matches known real-world city-pair great-circle distances", () => {
    // Paris/London great-circle distance is widely cited as ~213-214 miles.
    const paris = { lat: 48.8566, lng: 2.3522 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const dist = haversineMiles(paris, london);
    expect(dist).toBeGreaterThan(208);
    expect(dist).toBeLessThan(220);
  });

  it("is symmetric", () => {
    const a = { lat: 37.5407, lng: -77.436 };
    const b = { lat: 38.9072, lng: -77.0369 };
    expect(haversineMiles(a, b)).toBeCloseTo(haversineMiles(b, a), 10);
  });
});

function point(lat: number, lng: number, timestamp: number, accuracy?: number): GpsPoint {
  return { lat, lng, timestamp, accuracy };
}

describe("acceptFix", () => {
  it("accepts a first fix (no prev) with acceptable accuracy", () => {
    expect(acceptFix(undefined, point(37.5, -77.5, 0, 15))).toBe(true);
  });

  it("rejects a first fix with poor accuracy (> 35m)", () => {
    expect(acceptFix(undefined, point(37.5, -77.5, 0, 40))).toBe(false);
  });

  it("rejects on accuracy alone even when the step otherwise looks like plausible driving", () => {
    // Same step as the "accepts a plausible driving step" case below (clears
    // both the noise floor and the speed cap) — only next.accuracy (36 > 35)
    // differs, isolating this rejection branch from the others.
    const prev = point(37.5, -77.5, 0, 10);
    const next = point(37.5029, -77.5, 15_000, 36);
    expect(acceptFix(prev, next)).toBe(false);
  });

  it("rejects a step smaller than the noise floor (stationary GPS jitter)", () => {
    // ~33m north — under 2*(20+20)=80m default noise floor.
    const prev = point(37.5, -77.5, 0, 20);
    const next = point(37.5003, -77.5, 5_000, 20);
    // Sanity-check the fixture is really under the noise floor.
    expect(haversineMiles(prev, next) * METERS_PER_MILE).toBeLessThan(80);
    expect(acceptFix(prev, next)).toBe(false);
  });

  it("uses the ??20 default noise floor when accuracy is missing on both fixes", () => {
    const prev = point(37.5, -77.5, 0, undefined);
    const next = point(37.5003, -77.5, 5_000, undefined); // same tiny step as above, still < 80m
    expect(acceptFix(prev, next)).toBe(false);
  });

  it("rejects an implausible speed (> 100mph) even though the step clears the noise floor", () => {
    // ~1112m in 1 second => ~2488mph implied, comfortably over both the
    // noise floor (2*(10+10)=40m) and the 100mph speed cap.
    const prev = point(37.5, -77.5, 0, 10);
    const next = point(37.51, -77.5, 1_000, 10);
    const stepMeters = haversineMiles(prev, next) * METERS_PER_MILE;
    expect(stepMeters).toBeGreaterThan(40); // clears the noise floor
    expect(acceptFix(prev, next)).toBe(false);
  });

  it("accepts a plausible driving step", () => {
    // ~322m in 15s => ~48mph; clears both the accuracy gate and the 60m
    // noise floor (2*(15+15)), and is well under the 100mph speed cap.
    const prev = point(37.5, -77.5, 0, 15);
    const next = point(37.5029, -77.5, 15_000, 15);
    expect(acceptFix(prev, next)).toBe(true);
  });

  it("rejects a non-positive time delta (duplicate or out-of-order fix)", () => {
    const prev = point(37.5, -77.5, 10_000, 10);
    const next = point(37.51, -77.5, 10_000, 10); // same timestamp, big jump
    expect(acceptFix(prev, next)).toBe(false);
  });
});

describe("simplifyTrack", () => {
  it("leaves short tracks (<=2 points) untouched", () => {
    const pts = [point(37.5, -77.5, 0), point(37.51, -77.51, 1000)];
    expect(simplifyTrack(pts)).toEqual(pts);
  });

  it("keeps endpoints and drops redundant near-collinear points", () => {
    const pts: GpsPoint[] = [];
    for (let i = 0; i <= 20; i++) {
      // A near-straight line north with a tiny wiggle — well within default tolerance.
      pts.push(point(37.5 + i * 0.001, -77.5 + (i % 2 === 0 ? 0 : 0.0000001), i * 1000));
    }
    const simplified = simplifyTrack(pts);
    expect(simplified.length).toBeLessThan(pts.length);
    expect(simplified[0]).toEqual(pts[0]);
    expect(simplified[simplified.length - 1]).toEqual(pts[pts.length - 1]);
  });

  it("preserves a real turn (a point far from the endpoint chord survives)", () => {
    const pts: GpsPoint[] = [
      point(37.5, -77.5, 0),
      point(37.5, -77.4, 1000), // sharp turn east, far from the straight-line chord
      point(37.6, -77.4, 2000),
    ];
    const simplified = simplifyTrack(pts);
    expect(simplified).toContainEqual(pts[1]);
  });
});

describe("encodeTrack / decodeTrack", () => {
  it("round-trips a track within polyline precision (~1e-5 deg)", () => {
    const pts: GpsPoint[] = [
      point(37.5407, -77.436, 0),
      point(37.5512, -77.4421, 1000),
      point(37.5601, -77.451, 2000),
      point(37.5678, -77.4602, 3000),
    ];
    const encoded = encodeTrack(pts);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeTrack(encoded);
    expect(decoded).toHaveLength(pts.length);
    decoded.forEach((d, i) => {
      expect(d.lat).toBeCloseTo(pts[i].lat, 4);
      expect(d.lng).toBeCloseTo(pts[i].lng, 4);
    });
  });

  it("round-trips an empty track", () => {
    expect(decodeTrack(encodeTrack([]))).toEqual([]);
  });
});
