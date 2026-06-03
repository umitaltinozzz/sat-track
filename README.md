<p align="center">
  <img src="public/sat-track-icon.svg" width="96" alt="Sat-Track project icon">
</p>

<h1 align="center">Sat-Track</h1>

<p align="center">
  Real-time 3D satellite constellation tracker built with Three.js, satellite.js, and Vite.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-2.0.0-0ea5e9?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.172-111827?style=for-the-badge&logo=threedotjs&logoColor=white">
  <img alt="CI" src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white">
</p>

## Overview

Sat-Track is an interactive browser-based satellite tracking app. It renders Earth in 3D, loads live TLE data from CelesTrak, propagates satellite positions with SGP4/SDP4 calculations, and visualizes multiple orbital networks in real time.

The app is designed for exploring large satellite constellations such as Starlink, ISS, GPS, Galileo, OneWeb, Iridium, GLONASS, and BeiDou with responsive controls, search, orbit previews, visibility tools, and offline simulation fallbacks.

## Features

- Real-time satellite propagation using fresh CelesTrak TLE data
- 3D Earth scene with day/night textures, atmosphere, stars, and camera controls
- Multi-layer constellation support for Starlink, ISS, GPS, Galileo, OneWeb, Iridium, GLONASS, and BeiDou
- Satellite search by name or catalog identifier
- Orbit path rendering for selected satellites
- Time simulation controls with pause, resume, speed adjustment, and sync-to-now
- Sun direction and eclipse/terminator visualization
- Observer location support for elevation, azimuth, and pass visibility calculations
- Offline fallback using simulated orbital shells when live data is unavailable
- Mobile-aware performance tuning for smoother rendering on smaller devices
- Unit-tested core orbital helpers and utility functions

## Tech Stack

| Area              | Technology                    |
| ----------------- | ----------------------------- |
| 3D rendering      | Three.js                      |
| Orbit propagation | satellite.js                  |
| Build tool        | Vite                          |
| Language          | Vanilla JavaScript ES modules |
| Testing           | Jest                          |
| Quality           | ESLint, Prettier              |
| Deployment        | GitHub Pages workflow         |

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

```bash
git clone https://github.com/umitaltinozzz/sat-track.git
cd sat-track
npm install
```

### Development

```bash
npm run dev
```

Vite will start the local development server. Open the printed localhost URL in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## Available Scripts

| Command                | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Start the Vite development server                      |
| `npm run build`        | Build the app for production                           |
| `npm run preview`      | Preview the production build locally                   |
| `npm test`             | Run Jest tests                                         |
| `npm run lint`         | Run ESLint on source and test files                    |
| `npm run lint:fix`     | Automatically fix ESLint issues where possible         |
| `npm run format`       | Format source, tests, JSON, and Markdown with Prettier |
| `npm run format:check` | Check formatting without writing changes               |

## Controls

| Input          | Action                          |
| -------------- | ------------------------------- |
| Drag           | Rotate the globe                |
| Scroll / pinch | Zoom in or out                  |
| Left click     | Select and follow a satellite   |
| `H`            | Toggle the UI panel             |
| `Space` / `P`  | Pause or resume simulation time |
| `N`            | Sync simulation time to now     |
| `R`            | Reset the camera                |
| `Esc`          | Clear the current selection     |

## Project Structure

```text
.
├── public/
│   ├── sat-track-icon.svg
│   └── textures/
├── src/
│   ├── constants.js
│   ├── core.js
│   ├── helpers.js
│   ├── main.js
│   ├── StarlinkTracker.js
│   └── workers/
├── tests/
│   └── core.test.js
├── index.html
├── vite.config.js
└── package.json
```

## Data Sources

Sat-Track uses public satellite element data from CelesTrak:

- Starlink
- ISS and stations
- GPS operational satellites
- Galileo
- OneWeb
- Iridium NEXT
- GLONASS
- BeiDou

The app attempts direct CelesTrak access first and can use configured proxy fallbacks when a browser or network blocks direct requests.

## CI and Deployment

The repository includes GitHub Actions workflows for:

- Installing dependencies with `npm ci`
- Running lint checks
- Checking formatting
- Running Jest tests on Node.js 18 and 20
- Building and deploying the Vite output to GitHub Pages





This project is released under the MIT License.
