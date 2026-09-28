# Fockis Map — production-oriented foundation

This package contains a clean frontend and NestJS/Mongoose backend for a Fockis-owned geographic/address layer backed by Mapbox.

Architecture:
- Mapbox: worldwide base maps, geocoding/search, satellite/terrain and routing.
- Fockis API: authoritative Fockis buildings, units, addresses, address requests and permissions.
- MongoDB: permanent Fockis-owned location data.
- Frontend: React/Vite Mapbox UI.

Important:
1. The Mapbox public token belongs in the frontend as VITE_MAPBOX_ACCESS_TOKEN.
2. Never put an `sk.` Mapbox secret token in Vite/client code.
3. The backend uses JWT authentication. Adapt `JwtStrategy` to the exact user/JWT strategy already used by your main API if necessary.
4. Official Fockis addresses are deactivated rather than hard-deleted.
5. Normal users can request association with a unit, but cannot create, edit or delete official addresses.

Install frontend:
  npm install mapbox-gl

Install backend:
  npm install @nestjs/mongoose mongoose class-validator class-transformer @nestjs/passport passport passport-jwt

Frontend env:
  VITE_MAPBOX_ACCESS_TOKEN=pk.xxxxx

Backend env:
  MONGODB_URI=mongodb://...
  JWT_SECRET=...
  CORS_ORIGIN=http://localhost:5173

Suggested API prefix:
  /map

The code is intentionally isolated so it can be mounted into the existing Fockis web and API applications without replacing unrelated features.
