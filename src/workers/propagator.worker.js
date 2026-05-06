/**
 * Satellite propagation Web Worker.
 *
 * Handles all per-satellite SGP4 propagation, coordinate conversion,
 * shadow calculation, and color blending off the main thread.
 *
 * Message protocol:
 *   IN  { type: 'init',   layers: { [key]: { satData, simParams, color, satNames } } }
 *   IN  { type: 'update', simDateMs, selected, hovered, layerActive, starlinkActiveCount,
 *                        observer, highlightVisible, minElevation }
 *   OUT { type: 'result', layers, issPos, issShadow, tooltipData, stats, simDateMs }
 */

import * as satellite from 'satellite.js';
import { CONSTANTS } from '../constants.js';
import { computeShadowFactorKm, calculateSunDirection, SimulatedOrbit, calculateElevation } from '../core.js';

// Worker-side layer storage: { [key]: { satData: [], satNames: [], color: {r,g,b} } }
let workerLayers = {};
let layerOrder = [];

// ============================================================================
// Message handler
// ============================================================================

self.onmessage = function (e) {
    const msg = e.data;

    if (msg.type === 'init') {
        handleInit(msg);
    } else if (msg.type === 'update') {
        handleUpdate(msg);
    }
};

// ============================================================================
// Init: store satellite data and reconstruct SimulatedOrbit objects
// ============================================================================

function handleInit(msg) {
    workerLayers = {};
    layerOrder = Object.keys(msg.layers);

    for (const key of layerOrder) {
        const src = msg.layers[key];
        const satData = [];

        for (let i = 0; i < src.satData.length; i++) {
            const raw = src.satData[i];
            if (raw.isSimulated && src.simParams[i]) {
                // Reconstruct SimulatedOrbit from plain parameters
                const p = src.simParams[i];
                satData.push(new SimulatedOrbit(p.alt, p.incDeg, p.raanDeg, p.anomalyDeg));
            } else {
                // Real satrec — already a plain object, use as-is
                satData.push(raw);
            }
        }

        workerLayers[key] = {
            satData,
            satNames: src.satNames,
            color: src.color
        };
    }
}

// ============================================================================
// Update: run propagation for all enabled layers and post results back
// ============================================================================

function handleUpdate(msg) {
    const { simDateMs, selected, hovered, layerActive, starlinkActiveCount,
            observer, highlightVisible, minElevation } = msg;

    const simDate = new Date(simDateMs);
    const gmst = satellite.gstime(simDate);
    const sunDir = calculateSunDirection(simDate, satellite.gstime);

    const resultLayers = {};
    const transferables = [];
    let lit = 0;
    let dark = 0;
    let total = 0;
    let issPos = null;
    let issShadow = 0;
    let tooltipData = null;

    for (const layerKey of layerOrder) {
        if (!layerActive[layerKey]) continue;

        const wLayer = workerLayers[layerKey];
        if (!wLayer) continue;

        const totalCount = wLayer.satData.length;
        let activeCount = totalCount;
        if (layerKey === 'starlink') {
            activeCount = starlinkActiveCount;
        }
        activeCount = Math.min(activeCount, totalCount);

        const positions = new Float32Array(activeCount * 3);
        const colors = new Float32Array(activeCount * 3);

        const baseC = wLayer.color;
        const darkFactor = CONSTANTS.ECLIPSE_DIM_FACTOR;
        const darkC = {
            r: baseC.r * darkFactor,
            g: baseC.g * darkFactor,
            b: baseC.b * darkFactor
        };

        const isSelectedLayer = selected && selected.layer === layerKey;
        const isHoveredLayer = hovered && hovered.layer === layerKey;

        for (let i = 0; i < activeCount; i++) {
            const sat = wLayer.satData[i];
            let x = 0,
                y = 0,
                z = 0;
            let vX = 0,
                vY = 0,
                vZ = 0;
            let valid = false;
            let eciPos = null;

            if (sat.isSimulated) {
                const pos = sat.getPos(simDate);
                x = pos.x;
                y = pos.y;
                z = pos.z;
                valid = true;
            } else {
                try {
                    const pv = satellite.propagate(sat, simDate);
                    if (pv.position && !isNaN(pv.position.x)) {
                        eciPos = pv.position;
                        vX = pv.velocity.x;
                        vY = pv.velocity.y;
                        vZ = pv.velocity.z;
                        const gd = satellite.eciToGeodetic(pv.position, gmst);
                        const alt =
                            (CONSTANTS.EARTH_RADIUS_KM + gd.height) * CONSTANTS.RENDER_SCALE;
                        const phi = gd.latitude;
                        const theta = gd.longitude;
                        x = alt * Math.cos(phi) * Math.sin(theta);
                        y = alt * Math.sin(phi);
                        z = alt * Math.cos(phi) * Math.cos(theta);
                        valid = true;
                    }
                } catch (_e) {
                    // leave x,y,z = 0,0,0
                }
            }

            const pi3 = i * 3;
            positions[pi3] = x;
            positions[pi3 + 1] = y;
            positions[pi3 + 2] = z;

            if (!valid) {
                colors[pi3] = baseC.r;
                colors[pi3 + 1] = baseC.g;
                colors[pi3 + 2] = baseC.b;
                continue;
            }

            const xKm = x / CONSTANTS.RENDER_SCALE;
            const yKm = y / CONSTANTS.RENDER_SCALE;
            const zKm = z / CONSTANTS.RENDER_SCALE;
            const shadow = computeShadowFactorKm(xKm, yKm, zKm, sunDir);

            if (shadow > CONSTANTS.UMBRA_THRESHOLD) dark++;
            else lit++;
            total++;

            // ISS detection (first satellite in iss layer that matches naming)
            if (layerKey === 'iss' && issPos === null) {
                const satName = (wLayer.satNames[i] || '').toUpperCase();
                if (
                    satName.includes('ISS (ZARYA)') ||
                    satName === 'ISS' ||
                    satName.includes('ISS (')
                ) {
                    issPos = { x, y, z };
                    issShadow = shadow;
                }
            }

            const isSel = isSelectedLayer && selected.index === i;
            const isHov = isHoveredLayer && hovered.index === i;

            if (isSel || isHov) {
                colors[pi3] = isSel ? 0 : 0;
                colors[pi3 + 1] = 1;
                colors[pi3 + 2] = isSel ? 0 : 1;

                // Build tooltip data for selected or hovered satellite
                const distKm = Math.sqrt(xKm * xKm + yKm * yKm + zKm * zKm);
                const speed = Math.sqrt(vX * vX + vY * vY + vZ * vZ);
                tooltipData = {
                    layerKey,
                    idx: i,
                    distKm,
                    speed,
                    shadow,
                    isLocked: isSel
                };
            } else {
                const t = Math.pow(shadow, CONSTANTS.SHADOW_COLOR_EXPONENT);
                const inv = 1 - t;
                colors[pi3] = baseC.r * inv + darkC.r * t;
                colors[pi3 + 1] = baseC.g * inv + darkC.g * t;
                colors[pi3 + 2] = baseC.b * inv + darkC.b * t;

                // Visibility highlight: overrides shadow blend when enabled
                if (highlightVisible && observer && eciPos) {
                    const elev = calculateElevation(observer, eciPos, gmst);
                    if (elev >= minElevation) {
                        const hc = CONSTANTS.VIS_HIGHLIGHT_COLOR;
                        colors[pi3] = hc.r;
                        colors[pi3 + 1] = hc.g;
                        colors[pi3 + 2] = hc.b;
                    } else {
                        colors[pi3] *= CONSTANTS.VIS_DIM_FACTOR;
                        colors[pi3 + 1] *= CONSTANTS.VIS_DIM_FACTOR;
                        colors[pi3 + 2] *= CONSTANTS.VIS_DIM_FACTOR;
                    }
                }
            }
        }

        resultLayers[layerKey] = { positions, colors, activeCount };
        transferables.push(positions.buffer, colors.buffer);
    }

    const result = {
        type: 'result',
        layers: resultLayers,
        issPos,
        issShadow,
        tooltipData,
        stats: { lit, dark, total },
        simDateMs
    };

    self.postMessage(result, transferables);
}
