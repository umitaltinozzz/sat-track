/**
 * Pure, testable core functions for the Sat-Track application.
 * These functions have no DOM or Three.js dependencies.
 * @module core
 */

import { CONSTANTS } from './constants.js';

/**
 * Clamps a point size value to the allowed min/max range.
 * @param {number} size - Raw point size value
 * @param {number} min - Minimum allowed size
 * @param {number} max - Maximum allowed size
 * @returns {number} The clamped value
 */
export function clampPointSize(size, min, max) {
    if (typeof size !== 'number' || isNaN(size)) return min;
    return Math.min(max, Math.max(min, size));
}

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML special characters.
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string safe for HTML insertion
 */
export function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return str.replace(/[&<>"'`=/]/g, (char) => escapeMap[char]);
}

/**
 * Validates a single TLE line format.
 * @param {string} line - A TLE line (line 1 or line 2)
 * @param {number} lineNumber - Expected line number (1 or 2)
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateTLELine(line, lineNumber) {
    if (typeof line !== 'string') {
        return { valid: false, error: 'Line is not a string' };
    }

    const trimmed = line.trim();

    if (trimmed.length < 69) {
        return { valid: false, error: `Line too short: ${trimmed.length} chars (expected 69)` };
    }

    if (!trimmed.startsWith(`${lineNumber} `)) {
        return { valid: false, error: `Line does not start with "${lineNumber} "` };
    }

    // Validate checksum (mod-10 of sum of digits, with '-' counting as 1)
    const expectedChecksum = parseInt(trimmed.charAt(68), 10);
    if (isNaN(expectedChecksum)) {
        return { valid: false, error: 'Invalid checksum character' };
    }

    let sum = 0;
    for (let i = 0; i < 68; i++) {
        const ch = trimmed.charAt(i);
        if (ch >= '0' && ch <= '9') {
            sum += parseInt(ch, 10);
        } else if (ch === '-') {
            sum += 1;
        }
    }

    const computedChecksum = sum % 10;
    if (computedChecksum !== expectedChecksum) {
        return {
            valid: false,
            error: `Checksum mismatch: computed ${computedChecksum}, expected ${expectedChecksum}`
        };
    }

    return { valid: true };
}

/**
 * Validates a complete TLE entry (name + two lines).
 * @param {string} name - Satellite name
 * @param {string} line1 - TLE line 1
 * @param {string} line2 - TLE line 2
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateTLE(name, line1, line2) {
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Missing or empty satellite name');
    }

    const v1 = validateTLELine(line1, 1);
    if (!v1.valid) errors.push(`Line 1: ${v1.error}`);

    const v2 = validateTLELine(line2, 2);
    if (!v2.valid) errors.push(`Line 2: ${v2.error}`);

    return { valid: errors.length === 0, errors };
}

/**
 * Computes the shadow factor for a satellite position.
 * Returns 0 for fully sunlit, 1 for full umbra, intermediate for penumbra.
 * @param {number} xKm - X position in km
 * @param {number} yKm - Y position in km
 * @param {number} zKm - Z position in km
 * @param {{ x: number, y: number, z: number }} sunDir - Normalized sun direction vector
 * @returns {number} Shadow factor (0 = fully lit, 1 = full umbra)
 */
export function computeShadowFactorKm(xKm, yKm, zKm, sunDir) {
    const projKm = xKm * sunDir.x + yKm * sunDir.y + zKm * sunDir.z;

    // Satellite is on the sun side of Earth — fully lit
    if (projKm >= 0) return 0;

    // Perpendicular distance from Earth-Sun line
    const r2 = xKm * xKm + yKm * yKm + zKm * zKm;
    const proj2 = projKm * projKm;
    const d2 = Math.max(0, r2 - proj2);
    const dKm = Math.sqrt(d2);
    const xBehind = -projKm;

    const Re = CONSTANTS.EARTH_RADIUS_ATMO_KM;
    const Rs = CONSTANTS.SUN_RADIUS_KM;
    const D = CONSTANTS.SUN_DISTANCE_KM;

    // Umbra and penumbra cone radii at satellite distance
    let rUmbra = Re - (xBehind * (Rs - Re)) / D;
    if (rUmbra < 0) rUmbra = 0;
    const rPen = Re + (xBehind * (Rs + Re)) / D;

    if (dKm <= rUmbra) return 1; // Full umbra
    if (dKm >= rPen) return 0; // Fully sunlit

    // Smoothstep transition through penumbra
    const t = (dKm - rUmbra) / (rPen - rUmbra);
    const s = t * t * (3 - 2 * t);
    return 1 - s;
}

/**
 * Calculates the Sun's direction vector for a given date.
 * Uses standard astronomical algorithms (Jean Meeus).
 * @param {Date} date - The date/time to calculate for
 * @param {function} gstimeFn - Greenwich Sidereal Time function (satellite.gstime)
 * @returns {{ x: number, y: number, z: number }} Normalized sun direction in scene coordinates
 */
export function calculateSunDirection(date, gstimeFn) {
    const JD = date.getTime() / 86400000.0 + 2440587.5;
    const T = (JD - 2451545.0) / 36525.0;

    const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360;

    const rad = Math.PI / 180;
    const Mrad = M * rad;

    const C =
        (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
        (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
        0.000289 * Math.sin(3 * Mrad);

    const sunLon = (L0 + C) % 360;
    const epsilon = 23.439291 - 0.0130042 * T - 0.00000016 * T * T;
    const epsilonRad = epsilon * rad;
    const lambdaRad = sunLon * rad;

    const RA = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad));
    const Dec = Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad));

    const GMST = gstimeFn(date);
    const sunLonECEF = RA - GMST - Math.PI / 2;

    const x = Math.cos(Dec) * Math.cos(sunLonECEF);
    const y = Math.cos(Dec) * Math.sin(sunLonECEF);
    const z = Math.sin(Dec);

    // Convert to Three.js coordinate system (x, z, -y)
    const len = Math.sqrt(x * x + y * y + z * z);
    return { x: x / len, y: z / len, z: -y / len };
}

/**
 * Represents a simulated satellite orbit using Keplerian elements.
 * Used as fallback when live TLE data is unavailable.
 */
export class SimulatedOrbit {
    /**
     * @param {number} alt - Orbital altitude above Earth's surface in km
     * @param {number} inc - Orbital inclination in degrees
     * @param {number} raan - Right Ascension of Ascending Node in degrees
     * @param {number} anomaly - Initial true anomaly in degrees
     */
    constructor(alt, inc, raan, anomaly) {
        this.isSimulated = true;
        this.alt = alt;
        this.inc = inc * (Math.PI / 180);
        this.raan0 = raan * (Math.PI / 180);
        this.anomaly0 = anomaly * (Math.PI / 180);

        const r = CONSTANTS.EARTH_RADIUS_KM + alt;
        this.meanMotion = Math.sqrt(CONSTANTS.GRAVITATIONAL_PARAM / Math.pow(r, 3));

        const a = r;
        this.raanRate =
            -1.5 *
            this.meanMotion *
            CONSTANTS.J2_PERTURBATION *
            Math.pow(CONSTANTS.EARTH_RADIUS_KM / a, 2) *
            Math.cos(this.inc);

        this.epoch = Date.now() / 1000;
    }

    /**
     * Calculates satellite position at a given time.
     * @param {Date} date - The time to calculate position for
     * @returns {{ x: number, y: number, z: number }} Position in scene coordinates
     */
    getPos(date) {
        const t = date.getTime() / 1000 - this.epoch;
        const curAnomaly = this.anomaly0 + this.meanMotion * t;
        const curRaan = this.raan0 + this.raanRate * t;
        const r = (CONSTANTS.EARTH_RADIUS_KM + this.alt) * CONSTANTS.RENDER_SCALE;

        const x = r * Math.cos(curAnomaly);
        const y = r * Math.sin(curAnomaly);

        const x1 = x;
        const y1 = y * Math.cos(this.inc);
        const z1 = y * Math.sin(this.inc);

        const xFinal = x1 * Math.cos(curRaan) - y1 * Math.sin(curRaan);
        const yFinal = x1 * Math.sin(curRaan) + y1 * Math.cos(curRaan);
        const zFinal = z1;

        return { x: xFinal, y: zFinal, z: -yFinal };
    }
}

/**
 * Calculates satellite elevation angle as seen from a ground observer.
 * @param {{ lat: number, lon: number, alt: number }} observer - Observer geodetic position (radians, km)
 * @param {{ x: number, y: number, z: number }} satECI - Satellite ECI position in km
 * @param {number} gmst - Greenwich Mean Sidereal Time in radians
 * @returns {number} Elevation angle in degrees
 */
export function calculateElevation(observer, satECI, gmst) {
    const Re = CONSTANTS.EARTH_RADIUS_KM;
    const lat = observer.lat;
    const lon = observer.lon + gmst;

    // Observer position in ECI
    const obsX = Re * Math.cos(lat) * Math.cos(lon);
    const obsY = Re * Math.cos(lat) * Math.sin(lon);
    const obsZ = Re * Math.sin(lat);

    // Range vector
    const rx = satECI.x - obsX;
    const ry = satECI.y - obsY;
    const rz = satECI.z - obsZ;
    const range = Math.sqrt(rx * rx + ry * ry + rz * rz);

    // Up vector at observer (radial direction)
    const upLen = Math.sqrt(obsX * obsX + obsY * obsY + obsZ * obsZ);
    const ux = obsX / upLen;
    const uy = obsY / upLen;
    const uz = obsZ / upLen;

    // Dot product gives sin(elevation)
    const sinEl = (rx * ux + ry * uy + rz * uz) / range;
    return Math.asin(Math.max(-1, Math.min(1, sinEl))) * (180 / Math.PI);
}

/**
 * Calculates the azimuth angle (clockwise from true north) of a satellite as seen
 * from an observer. Uses ECI frame with the same coordinate convention as calculateElevation.
 * @param {{ lat: number, lon: number, alt: number }} observer - Geodetic position (lat/lon radians)
 * @param {{ x: number, y: number, z: number }} satECI - Satellite ECI position in km
 * @param {number} gmst - Greenwich Mean Sidereal Time in radians
 * @returns {number} Azimuth in degrees (0 = N, 90 = E, 180 = S, 270 = W)
 */
export function calculateAzimuth(observer, satECI, gmst) {
    const Re = CONSTANTS.EARTH_RADIUS_KM;
    const lat = observer.lat;
    const lon = observer.lon + gmst; // geographic → ECI

    // Observer ECI position
    const obsX = Re * Math.cos(lat) * Math.cos(lon);
    const obsY = Re * Math.cos(lat) * Math.sin(lon);
    const obsZ = Re * Math.sin(lat);

    // Range vector (observer → satellite)
    const rx = satECI.x - obsX;
    const ry = satECI.y - obsY;
    const rz = satECI.z - obsZ;

    // Up unit vector (radial from Earth centre)
    const upLen = Math.sqrt(obsX * obsX + obsY * obsY + obsZ * obsZ);
    const ux = obsX / upLen;
    const uy = obsY / upLen;
    const uz = obsZ / upLen;

    // East unit vector: Up cross Z-pole (0,0,1) → simplifies to (uy, -ux, 0)
    let ex = uy;
    let ey = -ux;
    const eLen = Math.sqrt(ex * ex + ey * ey);
    if (eLen < 1e-10) return 0; // azimuth undefined at poles
    ex /= eLen;
    ey /= eLen;

    // North unit vector: East cross Up
    const nx = ey * uz - 0 * uy; // ez = 0
    const ny = 0 * ux - ex * uz;
    const nz = ex * uy - ey * ux;

    // Project range onto North and East
    const rNorth = rx * nx + ry * ny + rz * nz;
    const rEast = rx * ex + ry * ey; // rz * ez = 0

    return (Math.atan2(rEast, rNorth) * (180 / Math.PI) + 360) % 360;
}

/**
 * Converts an azimuth angle in degrees to a 16-point cardinal direction string.
 * @param {number} deg - Azimuth in degrees (0-360)
 * @returns {string} Cardinal direction (e.g. "NNE", "SW")
 */
export function azimuthToCardinal(deg) {
    const dirs = [
        'N',
        'NNE',
        'NE',
        'ENE',
        'E',
        'ESE',
        'SE',
        'SSE',
        'S',
        'SSW',
        'SW',
        'WSW',
        'W',
        'WNW',
        'NW',
        'NNW'
    ];
    return dirs[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/**
 * Detects if the current device is mobile based on screen size and touch support.
 * @returns {boolean} True if mobile device detected
 */
export function isMobileDevice() {
    if (typeof window === 'undefined') return false;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouch && isSmallScreen;
}
