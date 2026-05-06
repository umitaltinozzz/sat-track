/**
 * Application-wide constants for the Sat-Track satellite tracker.
 * All magic numbers are documented here for easy maintenance.
 * @module constants
 */

export const CONSTANTS = {
    // === Earth & Space Physics ===
    EARTH_RADIUS_KM: 6371,
    EARTH_RADIUS_ATMO_KM: 6421,
    SUN_RADIUS_KM: 696340,
    SUN_DISTANCE_KM: 149597870,
    GRAVITATIONAL_PARAM: 398600.4418,
    J2_PERTURBATION: 1.08263e-3,

    // === Rendering Configuration ===
    RENDER_SCALE: 0.001,
    ATMOSPHERE_SCALE: 1.025,
    POINT_SIZE_DEFAULT: 2.0,
    POINT_SIZE_MIN: 1.0,
    POINT_SIZE_MAX: 8.0,
    ISS_POINT_SIZE: 8.0,
    ISS_ICON_RESOLUTION: 64,
    STAR_COUNT: 2000,
    STAR_SPREAD: 1500,

    // === Animation & Physics Timing ===
    PHYSICS_HZ: 30,
    RAYCAST_HZ: 20,
    ORBIT_POINTS: 300,
    ORBIT_DURATION_MINS: 95,

    // === Lighting & Shadow Calculation ===
    UMBRA_THRESHOLD: 0.98,
    PENUMBRA_MIN_THRESHOLD: 0.02,
    SHADOW_COLOR_EXPONENT: 1.25,
    TERMINATOR_BLEND_START: -0.1,
    TERMINATOR_BLEND_END: 0.1,
    ATMOSPHERE_SCATTER_START: 0.2,

    // === Network & Caching ===
    CACHE_TTL_MS: 3600000,
    CACHE_STALE_WARNING_MS: 1800000,
    FETCH_TIMEOUT_DIRECT: 10000,
    FETCH_TIMEOUT_PROXY: 10000,
    FETCH_TIMEOUT_TIME_API: 5000,
    FETCH_TIMEOUT_MAX_TOTAL: 30000,

    // === Retry Configuration ===
    RETRY_MAX_ATTEMPTS: 3,
    RETRY_BASE_DELAY_MS: 1000,
    RETRY_BACKOFF_MULTIPLIER: 2,

    // === Camera & Controls ===
    CAMERA_FOV: 45,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 2000,
    CAMERA_INITIAL_DISTANCE: 25,
    CAMERA_MIN_DISTANCE: 8,
    CAMERA_MAX_DISTANCE: 200,
    AUTO_ROTATE_SPEED: 0.5,
    DAMPING_FACTOR: 0.05,

    // === Search & UI ===
    SEARCH_DEBOUNCE_MS: 150,
    SEARCH_MIN_CHARS: 2,
    SEARCH_MAX_RESULTS: 12,

    // === Error Handling ===
    ERROR_TOAST_DURATION_MS: 4000,

    // === Eclipse Detection Thresholds ===
    ECLIPSE_DIM_FACTOR: 0.5,

    // === Visibility Highlight ===
    VIS_HIGHLIGHT_COLOR: { r: 0.2, g: 1.0, b: 0.2 },  // vivid green for visible sats
    VIS_DIM_FACTOR: 0.5,                                // dim non-visible sats to 50% brightness

    // === Mobile Performance ===
    MOBILE_STAR_COUNT: 800,
    MOBILE_PHYSICS_HZ: 15,
    MOBILE_RAYCAST_HZ: 10,
    MOBILE_ORBIT_POINTS: 150,

    // === Pass Prediction ===
    PASS_PREDICTION_HOURS: 24,
    PASS_MIN_ELEVATION_DEG: 10,
    PASS_TIME_STEP_SEC: 30,
    PASS_MAX_COUNT: 10,
    VISIBLE_COUNT_THROTTLE_MS: 2000,

    // === Texture URLs ===
    EARTH_DAY_TEXTURE: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    EARTH_NIGHT_TEXTURE: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    EARTH_DAY_TEXTURE_HI: '/textures/earth-day-8k.jpg',

    // === Earth Texture LOD ===
    EARTH_LOD_THRESHOLD: 14,
    EARTH_LOD_HYSTERESIS: 2,
    EARTH_LOD_CHECK_MS: 500,
    EARTH_LOD_LOAD_TIMEOUT_MS: 15000,

    // === TLE Data Sources ===
    TLE_URLS: {
        starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
        iss: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
        gps: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
        galileo: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle',
        oneweb: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle',
        iridium: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle',
        glonass: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=tle',
        beidou: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=beidou&FORMAT=tle'
    },
    TLE_JSON_URLS: {
        starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json',
        iss: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
        gps: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=json',
        galileo: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=json',
        oneweb: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=json',
        iridium: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=json',
        glonass: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=json',
        beidou: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=beidou&FORMAT=json'
    },

    // === CORS Proxies ===
    // Used as fallback when direct CelesTrak access is blocked (firewall, region, etc.).
    // CelesTrak also supports CORS natively so direct fetch is always tried first.
    CORS_PROXIES: [
        { name: 'corsproxy.io', template: 'https://corsproxy.io/?{url}', parseJson: false },
        {
            name: 'codetabs',
            template: 'https://api.codetabs.com/v1/proxy?quest={url}',
            parseJson: false
        }
    ],

    // === Simulation Shell Parameters ===
    SIM_SHELLS: {
        starlink: [
            { alt: 550, inc: 53.0, count: 1500 },
            { alt: 540, inc: 53.2, count: 1200 },
            { alt: 570, inc: 70.0, count: 500 },
            { alt: 560, inc: 97.6, count: 300 }
        ],
        oneweb: [{ alt: 1200, inc: 87.9, count: 648 }],
        gps: [{ alt: 20200, inc: 55.0, count: 32 }],
        galileo: [{ alt: 23222, inc: 56.0, count: 24 }],
        iss: [{ alt: 420, inc: 51.6, count: 1 }],
        iridium: [{ alt: 780, inc: 86.4, count: 66 }],
        glonass: [{ alt: 19130, inc: 64.8, count: 24 }],
        beidou: [
            { alt: 21528, inc: 55.0, count: 24 },
            { alt: 35786, inc: 55.0, count: 3 }
        ]
    }
};
