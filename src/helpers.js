/**
 * Browser-dependent helper functions for the Sat-Track application.
 * These functions interact with the DOM, canvas, and network.
 * @module helpers
 */

import { CONSTANTS } from './constants.js';

/**
 * Displays a user-facing error message as a toast notification.
 * @param {string} message - The error message to display
 */
export function showErrorToast(message) {
    const toast = document.getElementById('error-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('visible');
    void toast.offsetWidth;
    toast.classList.add('visible');

    setTimeout(() => {
        toast.classList.remove('visible');
    }, CONSTANTS.ERROR_TOAST_DURATION_MS);
}

/**
 * Logs an error to console and optionally shows user-facing message.
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {boolean} [showToUser=false] - Whether to show toast notification
 */
export function handleError(context, error, showToUser = false) {
    console.error(`[${context}]`, error);
    if (showToUser) {
        showErrorToast(`Error: ${context} - ${error.message || 'Unknown error'}`);
    }
}

/**
 * Retries an async operation with exponential backoff.
 * @param {function(): Promise<*>} fn - The async function to retry
 * @param {object} [opts] - Options
 * @param {number} [opts.maxAttempts] - Maximum number of attempts
 * @param {number} [opts.baseDelay] - Base delay in ms
 * @param {number} [opts.multiplier] - Backoff multiplier
 * @returns {Promise<*>} The result of the function
 * @throws {Error} The last error if all attempts fail
 */
export async function retryWithBackoff(fn, opts = {}) {
    const maxAttempts = opts.maxAttempts ?? CONSTANTS.RETRY_MAX_ATTEMPTS;
    const baseDelay = opts.baseDelay ?? CONSTANTS.RETRY_BASE_DELAY_MS;
    const multiplier = opts.multiplier ?? CONSTANTS.RETRY_BACKOFF_MULTIPLIER;

    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts - 1) {
                const delay = baseDelay * Math.pow(multiplier, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

/**
 * Creates a canvas-based space station icon for the ISS.
 * @returns {HTMLCanvasElement} Canvas element containing the ISS icon
 */
export function createISSIcon() {
    const size = CONSTANTS.ISS_ICON_RESOLUTION;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Glow effect
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    gradient.addColorStop(0, 'rgba(255, 209, 102, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 209, 102, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 209, 102, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Solar panels (horizontal)
    ctx.fillStyle = '#4a90d9';
    ctx.strokeStyle = '#6ab0ff';
    ctx.lineWidth = 1;

    ctx.fillRect(cx - 28, cy - 4, 18, 8);
    ctx.strokeRect(cx - 28, cy - 4, 18, 8);
    ctx.fillRect(cx + 10, cy - 4, 18, 8);
    ctx.strokeRect(cx + 10, cy - 4, 18, 8);

    // Grid lines
    ctx.strokeStyle = '#3a7ab9';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 28 + i * 4.5, cy - 4);
        ctx.lineTo(cx - 28 + i * 4.5, cy + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 10 + i * 4.5, cy - 4);
        ctx.lineTo(cx + 10 + i * 4.5, cy + 4);
        ctx.stroke();
    }

    // Vertical panels
    ctx.fillStyle = '#4a90d9';
    ctx.strokeStyle = '#6ab0ff';
    ctx.lineWidth = 1;
    ctx.fillRect(cx - 3, cy - 20, 6, 12);
    ctx.strokeRect(cx - 3, cy - 20, 6, 12);
    ctx.fillRect(cx - 3, cy + 8, 6, 12);
    ctx.strokeRect(cx - 3, cy + 8, 6, 12);

    // Central module
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#ffec99';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Truss
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    return canvas;
}

/**
 * Saves the current localStorage theme preference.
 * @param {string} theme - 'dark' or 'light'
 */
export function saveThemePreference(theme) {
    try {
        localStorage.setItem('sat-track-theme', theme);
    } catch (e) {
        // localStorage may be unavailable
    }
}

/**
 * Loads the saved theme preference.
 * @returns {string} 'dark' or 'light'
 */
export function loadThemePreference() {
    try {
        return localStorage.getItem('sat-track-theme') || 'dark';
    } catch (e) {
        return 'dark';
    }
}

/**
 * Saves the satellite point size preference to localStorage.
 * @param {number} size - Point size in screen pixels
 */
export function savePointSizePreference(size) {
    try {
        localStorage.setItem('sat-track-point-size', String(size));
    } catch (e) {
        // localStorage may be unavailable
    }
}

/**
 * Loads the saved satellite point size preference.
 * @param {number} defaultSize - Fallback value if nothing is stored
 * @returns {number} The saved point size
 */
export function loadPointSizePreference(defaultSize) {
    try {
        const stored = localStorage.getItem('sat-track-point-size');
        const parsed = parseFloat(stored);
        return isNaN(parsed) ? defaultSize : parsed;
    } catch (e) {
        return defaultSize;
    }
}

/**
 * Saves the observer location to localStorage.
 * @param {{ lat: number, lon: number }} loc - Location in degrees
 */
export function saveObserverLocation(loc) {
    try {
        localStorage.setItem('sat-track-observer', JSON.stringify(loc));
    } catch (e) {
        // localStorage may be unavailable
    }
}

/**
 * Loads the saved observer location from localStorage.
 * @returns {{ lat: number, lon: number } | null}
 */
export function loadObserverLocation() {
    try {
        const raw = localStorage.getItem('sat-track-observer');
        if (!raw) return null;
        const p = JSON.parse(raw);
        return typeof p.lat === 'number' && typeof p.lon === 'number' ? p : null;
    } catch (e) {
        return null;
    }
}

/**
 * Saves the satellite label visibility preference.
 * @param {boolean} enabled
 */
export function saveLabelsPreference(enabled) {
    try {
        localStorage.setItem('sat-track-labels', enabled ? '1' : '0');
    } catch (e) {
        // localStorage may be unavailable
    }
}

/**
 * Loads the saved labels preference.
 * @param {boolean} defaultVal - Fallback value
 * @returns {boolean}
 */
export function loadLabelsPreference(defaultVal = true) {
    try {
        const v = localStorage.getItem('sat-track-labels');
        if (v === null) return defaultVal;
        return v === '1';
    } catch (e) {
        return defaultVal;
    }
}
