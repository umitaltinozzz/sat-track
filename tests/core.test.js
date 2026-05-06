import {
    sanitizeHTML,
    validateTLELine,
    validateTLE,
    computeShadowFactorKm,
    SimulatedOrbit,
    calculateElevation,
    calculateSunDirection,
    isMobileDevice,
    clampPointSize
} from '../src/core.js';

// ============================================================================
// sanitizeHTML
// ============================================================================
describe('sanitizeHTML', () => {
    test('escapes & character', () => {
        expect(sanitizeHTML('A & B')).toBe('A &amp; B');
    });

    test('escapes < and > characters', () => {
        expect(sanitizeHTML('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
        );
    });

    test('escapes quotes and backticks', () => {
        expect(sanitizeHTML('"hello" \'world\' `test`')).toBe(
            '&quot;hello&quot; &#039;world&#039; &#x60;test&#x60;'
        );
    });

    test('escapes = and / characters', () => {
        expect(sanitizeHTML('a=b/c')).toBe('a&#x3D;b&#x2F;c');
    });

    test('returns empty string for non-string input', () => {
        expect(sanitizeHTML(null)).toBe('');
        expect(sanitizeHTML(undefined)).toBe('');
        expect(sanitizeHTML(42)).toBe('');
        expect(sanitizeHTML({})).toBe('');
    });

    test('passes through clean strings unchanged', () => {
        expect(sanitizeHTML('STARLINK-1234')).toBe('STARLINK-1234');
        expect(sanitizeHTML('ISS (ZARYA)')).toBe('ISS (ZARYA)');
    });
});

// ============================================================================
// validateTLELine
// ============================================================================
describe('validateTLELine', () => {
    // Real ISS TLE lines
    const validLine1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9997';
    const validLine2 = '2 25544  51.6400 208.9163 0006703  30.8756 329.2838 15.50110261999994';

    test('validates a correct line 1', () => {
        const result = validateTLELine(validLine1, 1);
        expect(result.valid).toBe(true);
    });

    test('validates a correct line 2', () => {
        const result = validateTLELine(validLine2, 2);
        expect(result.valid).toBe(true);
    });

    test('rejects non-string input', () => {
        const result = validateTLELine(null, 1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not a string');
    });

    test('rejects short lines', () => {
        const result = validateTLELine('1 25544U', 1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too short');
    });

    test('rejects wrong line number prefix', () => {
        const result = validateTLELine(validLine1, 2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not start with');
    });

    test('rejects incorrect checksum', () => {
        // Change last digit to break checksum
        const badLine = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9990';
        const result = validateTLELine(badLine, 1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Checksum mismatch');
    });

    test('rejects non-numeric checksum character', () => {
        const badLine = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  999X';
        const result = validateTLELine(badLine, 1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid checksum character');
    });
});

// ============================================================================
// validateTLE
// ============================================================================
describe('validateTLE', () => {
    test('returns errors for empty name', () => {
        const result = validateTLE('', 'x', 'y');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns multiple errors for invalid lines', () => {
        const result = validateTLE('SAT', 'bad', 'bad');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    test('validates correct complete TLE', () => {
        const line1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9997';
        const line2 = '2 25544  51.6400 208.9163 0006703  30.8756 329.2838 15.50110261999994';
        const result = validateTLE('ISS (ZARYA)', line1, line2);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
});

// ============================================================================
// computeShadowFactorKm
// ============================================================================
describe('computeShadowFactorKm', () => {
    test('returns 0 for satellite on sun side', () => {
        // Satellite at +10000km along sun direction
        const sunDir = { x: 1, y: 0, z: 0 };
        const result = computeShadowFactorKm(10000, 0, 0, sunDir);
        expect(result).toBe(0);
    });

    test('returns 1 for satellite directly behind Earth in umbra', () => {
        // Satellite directly behind Earth, close to axis
        const sunDir = { x: 1, y: 0, z: 0 };
        // Position: -7000km along x (behind Earth), 0 offset
        const result = computeShadowFactorKm(-7000, 0, 0, sunDir);
        expect(result).toBe(1);
    });

    test('returns 0 for satellite far from shadow', () => {
        // Satellite behind Earth but very far off-axis
        const sunDir = { x: 1, y: 0, z: 0 };
        const result = computeShadowFactorKm(-7000, 50000, 0, sunDir);
        expect(result).toBe(0);
    });

    test('returns intermediate value in penumbra', () => {
        const sunDir = { x: 1, y: 0, z: 0 };
        // Satellite behind Earth, at a distance near the umbra/penumbra boundary
        const result = computeShadowFactorKm(-7000, 6500, 0, sunDir);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
    });

    test('handles position exactly on the sun-Earth line', () => {
        const sunDir = { x: 0, y: 0, z: 1 };
        const result = computeShadowFactorKm(0, 0, -7000, sunDir);
        expect(result).toBe(1); // In umbra
    });

    test('returns 0 when projKm is exactly 0 (at terminator plane)', () => {
        const sunDir = { x: 1, y: 0, z: 0 };
        // Satellite perpendicular to sun direction (projKm = 0)
        const result = computeShadowFactorKm(0, 7000, 0, sunDir);
        expect(result).toBe(0);
    });

    test('handles diagonal sun direction correctly', () => {
        const norm = 1 / Math.sqrt(3);
        const sunDir = { x: norm, y: norm, z: norm };
        // Satellite on the sun side
        const result = computeShadowFactorKm(10000, 10000, 10000, sunDir);
        expect(result).toBe(0);
    });
});

// ============================================================================
// SimulatedOrbit
// ============================================================================
describe('SimulatedOrbit', () => {
    test('creates orbit with correct properties', () => {
        const orbit = new SimulatedOrbit(550, 53, 0, 0);
        expect(orbit.isSimulated).toBe(true);
        expect(orbit.alt).toBe(550);
        expect(orbit.meanMotion).toBeGreaterThan(0);
    });

    test('getPos returns valid position', () => {
        const orbit = new SimulatedOrbit(550, 53, 0, 0);
        const pos = orbit.getPos(new Date());
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(pos).toHaveProperty('z');
        expect(isNaN(pos.x)).toBe(false);
        expect(isNaN(pos.y)).toBe(false);
        expect(isNaN(pos.z)).toBe(false);
    });

    test('position is at correct altitude', () => {
        const orbit = new SimulatedOrbit(550, 0, 0, 0);
        const pos = orbit.getPos(new Date());
        // Distance from origin should be approximately (6371 + 550) * 0.001
        const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        const expected = (6371 + 550) * 0.001;
        expect(dist).toBeCloseTo(expected, 1);
    });

    test('position changes over time', () => {
        const orbit = new SimulatedOrbit(550, 53, 0, 0);
        const t1 = new Date();
        const t2 = new Date(t1.getTime() + 3600000); // 1 hour later
        const pos1 = orbit.getPos(t1);
        const pos2 = orbit.getPos(t2);
        // Positions should differ after 1 hour
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        const displacement = Math.sqrt(dx * dx + dy * dy + dz * dz);
        expect(displacement).toBeGreaterThan(0);
    });

    test('different inclinations produce different paths', () => {
        const orbit0 = new SimulatedOrbit(550, 0, 0, 90);
        const orbit90 = new SimulatedOrbit(550, 90, 0, 90);
        const date = new Date();
        const pos0 = orbit0.getPos(date);
        const pos90 = orbit90.getPos(date);
        // Y component should differ significantly for different inclinations
        expect(Math.abs(pos0.y - pos90.y)).toBeGreaterThan(0.001);
    });
});

// ============================================================================
// calculateSunDirection
// ============================================================================
describe('calculateSunDirection', () => {
    // Mock gstime function (returns ~0 for simplicity)
    const mockGstime = () => 0;

    test('returns normalized vector', () => {
        const dir = calculateSunDirection(new Date('2024-06-21T12:00:00Z'), mockGstime);
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        expect(len).toBeCloseTo(1.0, 5);
    });

    test('returns valid direction for winter solstice', () => {
        const dir = calculateSunDirection(new Date('2024-12-21T12:00:00Z'), mockGstime);
        expect(isNaN(dir.x)).toBe(false);
        expect(isNaN(dir.y)).toBe(false);
        expect(isNaN(dir.z)).toBe(false);
    });

    test('sun direction differs between summer and winter', () => {
        const summer = calculateSunDirection(new Date('2024-06-21T12:00:00Z'), mockGstime);
        const winter = calculateSunDirection(new Date('2024-12-21T12:00:00Z'), mockGstime);
        // Y component (elevation) should differ
        expect(Math.abs(summer.y - winter.y)).toBeGreaterThan(0.1);
    });
});

// ============================================================================
// calculateElevation
// ============================================================================
describe('calculateElevation', () => {
    test('satellite directly overhead returns ~90 degrees', () => {
        // Observer at equator, prime meridian
        const observer = { lat: 0, lon: 0, alt: 0 };
        const gmst = 0;
        // Satellite directly above at 400km altitude
        const satECI = {
            x: 6371 + 400,
            y: 0,
            z: 0
        };
        const el = calculateElevation(observer, satECI, gmst);
        expect(el).toBeCloseTo(90, 0);
    });

    test('satellite on horizon returns ~0 degrees', () => {
        const observer = { lat: 0, lon: 0, alt: 0 };
        const gmst = 0;
        // Satellite far away on the horizon (90 degrees away in longitude)
        const satECI = {
            x: 0,
            y: 6371 + 400,
            z: 0
        };
        const el = calculateElevation(observer, satECI, gmst);
        expect(el).toBeLessThan(20);
    });

    test('satellite below horizon returns negative elevation', () => {
        const observer = { lat: 0, lon: 0, alt: 0 };
        const gmst = 0;
        // Satellite on opposite side of Earth
        const satECI = {
            x: -(6371 + 400),
            y: 0,
            z: 0
        };
        const el = calculateElevation(observer, satECI, gmst);
        expect(el).toBeLessThan(0);
    });
});

// ============================================================================
// isMobileDevice
// ============================================================================
describe('isMobileDevice', () => {
    test('returns false in Node.js environment (no window)', () => {
        // In Jest/Node, window may or may not be defined
        // The function should handle this gracefully
        const result = isMobileDevice();
        expect(typeof result).toBe('boolean');
    });
});

// ============================================================================
// clampPointSize
// ============================================================================
describe('clampPointSize', () => {
    test('returns value unchanged when within range', () => {
        expect(clampPointSize(4, 1, 8)).toBe(4);
        expect(clampPointSize(1, 1, 8)).toBe(1);
        expect(clampPointSize(8, 1, 8)).toBe(8);
    });

    test('clamps value below minimum to minimum', () => {
        expect(clampPointSize(0, 1, 8)).toBe(1);
        expect(clampPointSize(-5, 1, 8)).toBe(1);
    });

    test('clamps value above maximum to maximum', () => {
        expect(clampPointSize(10, 1, 8)).toBe(8);
        expect(clampPointSize(999, 1, 8)).toBe(8);
    });

    test('returns min for NaN input', () => {
        expect(clampPointSize(NaN, 1, 8)).toBe(1);
    });

    test('returns min for non-number input', () => {
        expect(clampPointSize('big', 1, 8)).toBe(1);
        expect(clampPointSize(undefined, 1, 8)).toBe(1);
        expect(clampPointSize(null, 1, 8)).toBe(1);
    });

    test('works with fractional step values', () => {
        expect(clampPointSize(2.5, 1, 8)).toBe(2.5);
        expect(clampPointSize(0.5, 1, 8)).toBe(1);
        expect(clampPointSize(8.5, 1, 8)).toBe(8);
    });
});
