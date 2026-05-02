# Driftline (map-app)

A single-page **Angular** application for exploring maps and planning **driving routes**: search places with autocomplete, show them on a **Leaflet** map with **OpenStreetMap** tiles, optionally use the browser **geolocation** API as a start point, add waypoints, and draw a route using **Photon** (geocoding) and **OSRM** (routing).

**Branding:** “Driftline” in the UI; npm/Angular project id: `map-app`.

---

## Features

- **Search the map** — Debounced location suggestions (Photon), pick a result or use **Find** to jump the map and drop a marker.
- **Plan a route** — Start address or “use my location”, optional intermediate stops (up to 12), destination; geocode via Photon, route via public OSRM **driving** profile; polyline and labeled markers on the map.
- **Status messages** — User feedback for validation, geocoding errors, and route summary (distance / duration).
- **Responsive layout** — Sidebar controls and map column; Bootstrap 5 and custom SCSS.

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [Angular](https://angular.dev/) 21 (standalone components, application builder) |
| Language | TypeScript ~5.9 |
| Map | [Leaflet](https://leafletjs.com/) 1.9 |
| Styling | SCSS (`src/styles.scss`, per-component `.scss`), [Bootstrap 5.3](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/) via CDN in `src/index.html` |
| HTTP | `HttpClient` (Photon + OSRM) |
| Tests | [Vitest](https://vitest.dev/) via `ng test` (`@angular/build:unit-test`) |
| CI/CD | GitHub Actions — see [.github/workflows](.github/workflows) |

---

## External services

Configured in `src/environments/environment.ts` (development) and `environment.prod.ts` (production builds):

| Variable | Default | Role |
|----------|---------|------|
| `photonApiBase` | `https://photon.komoot.io/api/` | Forward geocoding and suggestions |
| `osrmRouteBase` | `https://router.project-osrm.org/route/v1/driving/` | Route geometry (GeoJSON) |

These are **public demo endpoints**. Use them fairly; for production traffic, run or contract dedicated Photon/OSRM (or compatible) infrastructure and point the environment files to your URLs.

---

## Prerequisites

- **Node.js** (LTS, e.g. 20 or 22) matching Angular 21 requirements
- **npm** (project declares `packageManager`: `npm@11.12.1` in `package.json`)

---

## Getting started

```bash
git clone <your-repo-url>
cd map-app
npm ci
npm start
```

Open `http://localhost:4200/`. The dev server reloads when source files change.

---

## NPM scripts

| Command | Description |
|---------|-------------|
| `npm start` | `ng serve` (development build, default configuration) |
| `npm run build` | Production build (default configuration: production) |
| `npm run watch` | `ng build --watch --configuration development` |
| `npm test` | Unit tests (Vitest); in CI, `CI=true` is set so the runner exits after one pass |

---

## Build output

Production build artifacts are written to:

`dist/map-app/browser/`

That folder is what you deploy to static hosting (for example **Amazon S3** in this repo’s GitHub Actions workflow).

---

## Project structure (high level)

```
src/
├── app/
│   ├── app.ts / app.html / app.scss    # Shell: header, footer, router outlet
│   ├── app.config.ts                   # Router, HttpClient
│   ├── app.routes.ts                   # Default route → map page
│   ├── map/
│   │   ├── map-page.ts / .html / .scss # Map, search, routing UI + Leaflet
│   │   └── map-page.component.spec.ts
│   ├── location-suggest-input/       # Autocomplete combobox (Photon)
│   └── geocoding/                      # Photon service + suggestion models
├── assets/
│   └── images/                         # brand-mark.png, favicon.png (referenced in app + index)
├── environments/                     # API base URLs
├── index.html                        # Favicon, Bootstrap / fonts CDN
├── main.ts
└── styles.scss                       # Global styles + Leaflet CSS import
public/                               # Optional static files copied to site root
.github/workflows/
├── ci.yml                            # Test + build on PR/push (main|master)
└── deploy-aws.yml                  # Test, build, sync to S3 (+ optional CloudFront)
docs/
└── aws-deployment.md               # AWS + GitHub secrets/variables for deploy
```

---

## Assets

- **Header logo:** `/assets/images/brand-mark.png` (see `app.html`).
- **Favicon:** `/assets/images/favicon.png` (see `index.html`).
- `angular.json` copies `src/assets` to `assets/` in the browser output so these paths work in dev and production.

---

## Testing

```bash
npm test
```

Specs live next to sources (`*.spec.ts`), including the root component, map page (with a Leaflet mock), location suggest input, Photon service, route config, and geocoding model helpers.

---

## CI/CD and deployment

- **CI:** [.github/workflows/ci.yml](.github/workflows/ci.yml) — install, test, production build on pushes and pull requests targeting `main` or `master`.
- **AWS:** [.github/workflows/deploy-aws.yml](.github/workflows/deploy-aws.yml) — on push to `main`/`master` (or manual **workflow_dispatch**), runs tests and build, uploads `dist/map-app/browser` to **S3**, optionally invalidates **CloudFront** if the repo variable `CLOUDFRONT_DISTRIBUTION_ID` is set.

Full setup (OIDC IAM role, bucket, GitHub secrets) is documented in [docs/aws-deployment.md](docs/aws-deployment.md).

---

## SPA routing

The app uses `base href="/"` and a single route (`path: ''` → `MapPageComponent`). If you host under a **subpath** or add deep links, adjust `base-href` in the Angular build and configure your CDN/S3 (for example CloudFront custom error responses to `index.html`) so client-side routes keep working.

---

## Code scaffolding (Angular CLI)

```bash
ng generate component component-name
ng generate --help
```

See the [Angular CLI documentation](https://angular.dev/tools/cli).

---

## License

This project is **private** (`"private": true` in `package.json`). Add a `LICENSE` file if you open-source it.
