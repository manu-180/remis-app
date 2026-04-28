# Address Search + Route Visualization (Passenger App)

**Date:** 2026-04-28
**Owner:** Manuel
**Status:** Approved — proceeding to implementation plan
**Scope:** `apps/passenger`

---

## Problem

The passenger app currently shows a Google Map with the user's current position, but the destination search is limited to client-side filtering of frequent/recent addresses and local POIs from Supabase. There is no real address autocomplete and no route visualization between origin and destination. To compete with Uber/Cabify-class apps and provide a premium experience for the remisería demo, we need to:

1. Search any address in Argentina with real-time autocomplete (typo tolerance, POIs, street numbers).
2. Show the actual driving route between origin and destination as a polyline drawn over the streets.
3. Display estimated time, distance, and fare prominently.
4. Wrap it in a premium hybrid layout (map + expandable bottom panel).

---

## Goals & Non-Goals

**In scope**
- Real-time Google Places Autocomplete biased to Argentina.
- Route polyline rendering using Google Directions API.
- New hybrid home screen layout (map ~60% / panel ~40%, panel expands when searching).
- Distance, ETA, and fare visible in a floating chip on the map.
- Reuse of existing `frequentAddressesProvider` / `recentDestinationsProvider` for the empty state.
- Argentina-only filter (`components=country:ar`).

**Out of scope (explicit non-goals)**
- Migration of API key to Supabase Edge Functions (deferred to production hardening — Approach A for the demo).
- Driver app changes — this work targets only `apps/passenger`.
- Turn-by-turn navigation, voice prompts, or step-by-step instructions.
- Multi-stop routes / waypoints.
- Live re-routing while in trip.

---

## Architecture

### Approach selected: A — Direct Google APIs from Flutter

Flutter calls Google Places & Directions endpoints directly via HTTP. The existing `GOOGLE_MAPS_API_KEY` (already loaded via `--dart-define-from-file=env/dev.json`) is reused. Production hardening (moving the key behind Supabase Edge Functions) is deferred and tracked as a follow-up.

### High-level flow

```
1. Home renders → map shows current GPS position (existing behavior).
2. User taps "¿A dónde vas?" → bottom panel expands; search input gains focus.
3. User types → debounced (400 ms) call to Places Autocomplete with Argentina bias.
4. User picks a result → Place Details API resolves the placeId to LatLng.
5. Directions API is called with origin (current location) + destination (LatLng).
6. Encoded polyline is decoded → drawn on the map. Camera animates to fit both markers.
7. Fare estimate (existing `estimate_fare` Supabase RPC) runs in parallel.
8. Floating chip shows fare · ETA · distance. CTA "Confirmar destino" enabled.
9. CTA → existing ride request flow (unchanged downstream).
```

### Components

#### New files

| File | Purpose |
|---|---|
| `apps/passenger/lib/features/ride_request/data/services/places_service.dart` | Wraps Places Autocomplete + Place Details. Returns `List<PlacePrediction>` and `PlaceDetail`. |
| `apps/passenger/lib/features/ride_request/data/services/directions_service.dart` | Wraps Directions API. Returns decoded polyline points, distance (m), duration (s). |
| `apps/passenger/lib/features/ride_request/data/models/place_prediction.dart` | `placeId`, `mainText`, `secondaryText`, optional `distanceMeters`. |
| `apps/passenger/lib/features/ride_request/data/models/route_result.dart` | `polyline: List<LatLng>`, `distanceMeters`, `durationSeconds`. |
| `apps/passenger/lib/features/home/presentation/widgets/route_panel.dart` | The expandable bottom panel with the 3 states (collapsed, searching, route ready). |
| `apps/passenger/lib/features/home/presentation/widgets/route_info_chip.dart` | The floating chip on the map with fare · ETA · distance. |

#### Modified files

| File | Change |
|---|---|
| `apps/passenger/lib/features/home/presentation/screens/home_screen.dart` | Replace current full-screen map layout with hybrid layout. Wire up route polyline + camera fitting. |
| `apps/passenger/lib/features/ride_request/presentation/screens/destination_search_screen.dart` | Integrate `PlacesService`. Keep existing frequent/recent sections for empty query. Highlight the matched substring in suggestion rows. |
| `apps/passenger/lib/features/ride_request/data/ride_providers.dart` | Add `placePredictionsProvider` (debounced family by query string) and `routeProvider` (family by origin+dest). |
| `apps/passenger/pubspec.yaml` | Add dependency for polyline decoding (e.g. `google_polyline_algorithm: ^3.1.0`). |

#### Unchanged

`tracking_screen.dart`, driver app, Supabase tables, `estimate_fare` RPC, Edge Functions.

### Data flow

```
HomeScreen
  ├── GoogleMap (markers + Polyline)
  ├── RouteInfoChip (when route loaded)
  └── RoutePanel
        ├── State: collapsed → "¿A dónde vas?" tap target
        ├── State: searching → opens DestinationSearchScreen
        └── State: routeReady → origen → destino + Confirmar destino CTA

DestinationSearchScreen
  ├── Search input (debounced)
  ├── placePredictionsProvider(query)
  │     └── PlacesService.autocomplete(query, country: AR, locationBias: currentLatLng)
  ├── frequentAddressesProvider (empty query)
  └── recentDestinationsProvider (empty query)
        └── on tap → PlacesService.details(placeId) → LatLng
              → routeProvider(origin, dest)
                    └── DirectionsService.route(origin, dest)
                          └── decodePolyline + parse distance/duration
```

### Why this design

- **Reuses what exists.** No backend changes, no DB migrations, no new Edge Functions. The TODO comment in `destination_search_screen.dart` is finally resolved.
- **Fits the project conventions.** Riverpod providers, feature-folder structure, services under `data/services/`, models under `data/models/`. Identical patterns to `ride_repository.dart`.
- **Boundaries are clean.** Each service has one responsibility (Places vs Directions). The panel widget owns its three states. The map screen orchestrates but doesn't know about HTTP.
- **Premium UX without overengineering.** The hybrid layout (Design C) gives map context + room for results without modal full-screen takeovers. The polyline + chip + animated camera fit are the high-impact polish details that make it feel like Uber.

---

## Error handling

| Scenario | Behavior |
|---|---|
| No internet during autocomplete | Show inline "Sin conexión" hint inside the search list; existing recents/favorites remain usable. |
| Places API quota exceeded / 4xx | Toast "No se pudieron cargar sugerencias"; degrade to recents/favorites. |
| Directions API failure | Toast "No se pudo calcular la ruta"; markers still drawn, polyline omitted, fare from `estimate_fare` shown if available. |
| `ZERO_RESULTS` from Directions | Show "No hay ruta disponible" inside the chip; CTA disabled. |
| Permission revoked mid-flow | Existing `LocationPermissionResult` flow handles this; redirect to disclosure screen. |
| Empty query | Show frequents + recents (existing behavior). |
| Query < 2 chars | Skip API call, show cached recents. |

All HTTP calls go through a single `_request` helper in each service that maps non-2xx responses to a typed `PlacesException` / `DirectionsException` consumed by Riverpod's `AsyncValue.error`.

---

## Testing approach

- **Unit tests** for `PlacesService` and `DirectionsService` — mock the HTTP client, assert request URL composition (country bias, location, key) and response parsing (polyline decoding, edge cases).
- **Widget test** for `RoutePanel` — verify the three states render correctly given different provider values.
- **Manual QA checklist** (covered during demo verification):
  1. Type "Termin" → see "Terminal de Ómnibus" appear in <1s.
  2. Type a residential street + number → matches.
  3. Pick a result → polyline appears in <2s, camera fits both markers.
  4. Try a destination outside AR → no result (filtered).
  5. Airplane mode mid-typing → graceful fallback.
  6. Re-tap destination after route is drawn → returns to search state with current value editable.

---

## Open follow-ups (not in this spec)

- Move `GOOGLE_MAPS_API_KEY` to Supabase secrets + create `places-autocomplete` and `directions-route` Edge Functions for production. (Tracked as the existing TODO in `destination_search_screen.dart`.)
- Restrict the API key in Google Cloud Console to the Android app signature + iOS bundle ID.
- Add session tokens to Places Autocomplete to optimize billing (one billable session = many autocomplete calls + one details call).
