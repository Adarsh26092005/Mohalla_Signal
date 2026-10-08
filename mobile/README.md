# Mohalla Signal - Mobile Application (Flutter)

> **Status: Future Phase (Not implemented in Phase 1)**

## Purpose
The mobile application will be built using Flutter as a dedicated client application for merchants and customers. It will consume the same standardized, authenticated REST and WebSocket APIs provided by the NestJS backend.

## Architectural Guidelines
1. **Strict Separation of Concerns**: Mobile client code must remain completely separated in the `mobile/` directory and never be intermixed with `backend/` or `web/`.
2. **API Driven**: All authentication, demand aggregation, product matching, and security checks are enforced server-side.
3. **No Direct Database Access**: The mobile app interacts purely through validated backend endpoints.
4. **Implementation Schedule**: The Flutter application will be initialized in a dedicated mobile phase once core backend API contracts and security rules are verified.
