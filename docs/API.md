# API Documentation

Orbium provides a REST API for managing celestial bodies and presets.

## Base URL
All API requests are prefixed with `/api`. When running the full stack, the Nginx proxy routes these requests to the backend service.

---

## Presets (`/api/presets`)

Manage synthesizer configurations.

### 1. List Presets
Returns a list of presets available to the current user (currently defaults to "anonymous").

- **Method**: `GET`
- **Path**: `/api/presets`
- **Query Parameters**:
  - `type` (Optional): Filter by `sun`, `planet`, or `moon`.
  - `category` (Optional): Filter by category (e.g., `ambient`, `bass`, `pad`).
  - `sort_by` (Default: `name`): Sort field (`name`, `type`, `category`, `created_at`).
  - `order` (Default: `asc`): `asc` or `desc`.
- **Response**: `List[PresetResponse]`

### 2. Get System Defaults
Returns the built-in system presets that cannot be modified.

- **Method**: `GET`
- **Path**: `/api/presets/defaults`
- **Response**: `List[PresetResponse]`

### 3. Create Preset
Save a new configuration.

- **Method**: `POST`
- **Path**: `/api/presets`
- **Request Body**: `PresetCreate` (JSON)
- **Response**: `PresetResponse`

### 4. Get Single Preset
- **Method**: `GET`
- **Path**: `/api/presets/{preset_id}`
- **Response**: `PresetResponse`
- **Error Codes**: 404 if not found.

### 5. Update Preset
Modify an existing user preset. System presets (defaults) are protected.

- **Method**: `PATCH`
- **Path**: `/api/presets/{preset_id}`
- **Request Body**: `PresetUpdate` (JSON)
- **Response**: `PresetResponse`
- **Error Codes**: 403 if attempting to update a system preset, 404 if not found.

### 6. Delete Preset
Delete a user preset.

- **Method**: `DELETE`
- **Path**: `/api/presets/{preset_id}`
- **Response**: `{"status": "deleted"}`
- **Error Codes**: 403 if system preset, 404 if not found.

---

## Bodies (`/api/bodies`)

Manage active celestial bodies in the simulation.

### 1. List Active Bodies
Returns all bodies currently saved in the database for the session.

- **Method**: `GET`
- **Path**: `/api/bodies`
- **Response**: `List[BodyInstanceResponse]`

### 2. Create Body
Add a new body to the simulation.

- **Method**: `POST`
- **Path**: `/api/bodies`
- **Request Body**: `BodyInstanceCreate` (JSON)
- **Response**: `BodyInstanceResponse`

### 3. Update Body
Update position, velocity, or audio parameters of an active body.

- **Method**: `PATCH`
- **Path**: `/api/bodies/{body_id}`
- **Request Body**: `BodyInstanceUpdate` (JSON)
- **Response**: `BodyInstanceResponse`
- **Error Codes**: 404 if not found.

### 4. Delete Body
Remove a body from the simulation.

- **Method**: `DELETE`
- **Path**: `/api/bodies/{body_id}`
- **Response**: `{"status": "deleted"}`
- **Error Codes**: 404 if not found.

### 5. Add Attribute
Attach a named attribute or preset to a body instance.

- **Method**: `POST`
- **Path**: `/api/bodies/{body_id}/attributes`
- **Request Body**: `Dict[str, Any]` (JSON)
- **Response**: `BodyInstanceResponse`

---

## Health Check (`/api/health`)

- **Method**: `GET`
- **Path**: `/api/health`
- **Description**: Verifies service status and database connectivity.
- **Response**: `{"status": "ok", "database": "connected"}`
