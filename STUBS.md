# Backend Stubs for Aegis Protocol

This document outlines backend functionalities that are currently mocked, conceptual, or handled by client-side logic in the Aegis Protocol frontend demonstration. These stubs represent areas requiring backend implementation for a fully functional system.

## 1. User Account Management

*   **Authentication & Authorization:**
    *   Secure user registration (username, password hashing).
    *   Login mechanisms (password verification, session/token generation).
    *   Secure session management (e.g., JWT, opaque tokens stored securely).
    *   Role-based access control (e.g., distinguishing regular users from arbiters).
    *   Logout functionality (server-side session/token invalidation).
*   **User Profile Management:**
    *   Database storage for user profiles:
        *   `id`: Unique user identifier.
        *   `username`: User's chosen display name.
        *   `reputationScore`: Calculated and updated based on escrow history.
        *   `settings`: Persisting user preferences like `useTor`, `moneroNodeUrl`, `totpEnabled`, `totpSecretMock`.
    *   API endpoints for retrieving and updating user profiles and settings.
*   **Two-Factor Authentication (TOTP):**
    *   Backend generation and secure storage of TOTP secrets associated with user accounts (e.g., encrypted at rest).
    *   Endpoints for enabling TOTP: providing the secret/QR code (data for QR) to the client.
    *   Endpoints for verifying TOTP codes during login or for sensitive operations (like disabling TOTP, or if used for authorizing wallet operations).
    *   Endpoints for disabling TOTP (requiring current TOTP verification).
*   **(Conceptual) Encrypted Mnemonic Cloud Backup (Optional Feature):**
    *   If a feature for users to back up their client-side encrypted mnemonic (from `AccountModal.tsx`) to the server is desired:
        *   Securely storing user-provided, client-side encrypted mnemonic blobs.
        *   Implementing robust access controls and recovery mechanisms for these backups, ensuring the server never has access to the unencrypted mnemonic.
*   **User Existence Validation:**
    *   Endpoint to check if a `otherPartyId` (used in `CreateEscrowModal.tsx`) corresponds to a valid, existing user.

## 2. Escrow Core Logic & Management

*   **Escrow CRUD Operations:**
    *   **Create Escrow:**
        *   API endpoint to receive escrow creation data (title, description, amount, participant IDs, default outcome, timer duration).
        *   Validate input: ensure participant IDs exist, amount is valid, etc.
        *   Generate unique escrow ID.
        *   Assign an arbiter (e.g., from a pool, based on round-robin or other logic).
        *   Initiate multi-signature address generation (see Section 3).
        *   Store escrow details in the database with initial `PENDING_FUNDING` status.
    *   **Read Escrow:**
        *   API endpoint to retrieve full details for a specific escrow by ID (for `EscrowDetailPage.tsx`).
        *   API endpoint to list escrows for a user (`DashboardPage.tsx`) or an arbiter (`ArbiterDashboardPage.tsx`) with server-side:
            *   Filtering (by status, participant, search terms).
            *   Sorting (by creationDate, amount, status).
            *   Pagination.
    *   **Update Escrow:**
        *   Endpoints to handle various state-changing actions:
            *   Participant funding (`buyer.hasFunded`, `seller.hasFunded`).
            *   Participant confirmation (`buyer.hasConfirmed`, `seller.hasConfirmed`).
            *   Dispute initiation (`status`, `arbiterInvolved`, `disputeReason`).
            *   Arbiter ruling (`arbiterRuling`, `resolutionDetails`, `status`).
            *   Timelock expiry processing (`resolutionDetails`, `status`).
        *   Update `lastUpdateDate` on every modification.
    *   **Delete Escrow:**
        *   API endpoint to delete an escrow.
        *   Enforce business rules: e.g., only initiator can delete, and only if status is `PENDING_FUNDING` and no funds are detected on-chain.
*   **Escrow State Machine:**
    *   Backend enforcement of the defined escrow lifecycle and valid status transitions (as defined in `EscrowStatus` and `EscrowDetailPage.tsx` logic).
*   **Chat & Evidence Logging:**
    *   API endpoint to receive new chat messages (`ChatMessage`).
    *   Store messages with `escrowId`, `senderId`, `senderUsername`, `text`, `timestamp`, and `isEvidence` flag.
    *   Ensure chronological order and integrity of chat logs.
    *   Provide API endpoint to retrieve chat logs for an escrow, potentially with filtering for evidence.
    *   If actual file uploads for evidence are desired (beyond text in chat), backend needs to handle file storage (e.g., S3, IPFS) and link to evidence entries.
*   **Timelock Management:**
    *   Reliable backend mechanism (e.g., cron job, scheduled task system) to monitor escrow `creationDate` and `timerDurationHours`.
    *   When a timer expires for an active escrow (not yet resolved or disputed indefinitely), automatically:
        *   Update escrow status to `TIMELOCK_DEFAULT_TRIGGERED` or directly to the default outcome status (e.g., `COMPLETED_REFUNDED`).
        *   Set `resolutionDetails` based on `defaultOutcome`.
        *   Initiate the process for fund movement according to the default outcome.
    *   Notify relevant parties about impending or actual timelock expirations (could use Notification Service, see Section 4).

## 3. Monero Blockchain Interaction & Wallet Operations

*   **Monero Node Communication:**
    *   Backend maintains a connection to one or more trusted Monero full nodes (daemon RPC).
    *   This can be a node run by the platform or allow users to specify their node if the backend proxies requests.
*   **Multi-Signature Address Generation & Management:**
    *   Securely generate Monero 2-of-3 multi-signature addresses and related data (e.g., key images, redeem scripts if necessary for the specific Monero multi-sig scheme used).
    *   Requires public keys from buyer, seller, and the assigned arbiter. The backend will need a way to obtain/manage these, especially the arbiter's public key.
    *   Store and associate these multi-sig details (address, constituent public keys) with escrows.
*   **Transaction Monitoring & Verification (On-Chain):**
    *   Continuously scan the Monero blockchain for transactions sent to escrow multi-sig addresses.
    *   Verify transaction amounts and confirmations.
    *   Update escrow status (e.g., `buyer.hasFunded`, `seller.hasFunded`, changing overall status to `BUYER_FUNDED`, `SELLER_CONFIRMED_ITEM` or `ACTIVE`) based on confirmed on-chain funding.
*   **Transaction Construction & Signing Coordination (for Release/Refund/Split):**
    *   Backend constructs the appropriate Monero transaction to move funds from the multi-sig address based on the resolution (agreement, arbiter decision, timelock default).
    *   This involves a complex coordination process for 2-of-3 signatures:
        *   Generating partially signed transactions (PSBT-like mechanism for Monero if available, or custom flow).
        *   Securely requesting signatures from the relevant parties (e.g., buyer and seller for mutual agreement; arbiter and one party for dispute resolution).
        *   Combining partial signatures.
    *   Broadcasting the fully signed resolution transaction to the Monero network.
    *   Monitoring this transaction for confirmation and updating the escrow to its final `COMPLETED_*` status.
*   **Client Wallet RPC Abstraction (for `AccountModal.tsx` features):**
    *   If the "Scan Transactions" feature in `AccountModal.tsx` is intended to show a user's personal wallet history (not just Aegis escrows):
        *   A secure backend proxy for `get_transfers` (and `get_balance`, `get_height`, etc.) calls to a user's specified Monero wallet RPC.
        *   This implies the user would need to provide their node's RPC details (URL, and potentially credentials if their node is protected) to the Aegis backend via the client settings for the proxy to function.

## 4. Notification Service

*   **Real-Time Event Broadcasting:**
    *   Implement a service (e.g., using WebSockets, Server-Sent Events, or a push notification gateway) to send real-time updates to connected clients.
    *   **Events include:**
        *   Escrow status changes (e.g., other party funded, dispute initiated by other party, arbiter ruling made).
        *   New chat messages received in an active escrow.
        *   Timelock expiration warnings or notifications.
        *   Successful completion or failure of backend operations initiated by the user.
    *   The client-side `NotificationArea.tsx` would subscribe to these events and display them.
*   **User-Specific Notifications:**
    *   Ensure notifications are targeted only to relevant users (participants of an escrow, the assigned arbiter).
*   **Persistence (Optional for some notifications):**
    *   While many notifications are transient, some critical alerts might need to be persisted in the database if the user is offline, to be delivered upon next login (though the current UI focuses on real-time toast notifications).

## 5. Arbiter System Backend Support

*   **Arbiter Pool & Assignment:**
    *   Management of the arbiter pool (if not static and pre-vetted).
    *   Logic for assigning arbiters to new escrows (as mentioned in Escrow Creation).
*   **Arbiter-Specific Endpoints:**
    *   Endpoints to list disputes assigned to a specific arbiter (for `ArbiterDashboardPage.tsx`).
    *   Endpoints for arbiters to submit their rulings on disputes, which would then trigger escrow state updates (as covered in "Update Escrow").
    *   Secure management of arbiter identities and their association with their Monero public keys for multi-sig.