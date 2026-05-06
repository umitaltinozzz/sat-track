/**
 * Application entry point for Sat-Track.
 * @module main
 */

import { StarlinkTracker } from './StarlinkTracker.js';
import { handleError } from './helpers.js';

let trackerInstance = null;

window.addEventListener('load', () => {
    try {
        trackerInstance = new StarlinkTracker();

        window.disposeTracker = () => {
            if (trackerInstance) {
                trackerInstance.dispose();
                trackerInstance = null;
            }
        };
    } catch (error) {
        handleError('Application startup', error, true);
    }
});

window.addEventListener('beforeunload', () => {
    if (trackerInstance) {
        trackerInstance.dispose();
    }
});
