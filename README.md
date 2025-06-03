# Aegis Protocol - Secure Escrow DApp

**A Frontend Interface for a Decentralized Escrow Application for Monero.**

## Overview

Aegis Protocol is a decentralized application (DApp) designed to facilitate secure, private escrows using Monero (XMR). This project currently provides an **interactive frontend** showcasing core user flows, UI/UX, and intended functionalities.

**Important Note:** This version does not process real Monero transactions or perform actual Monero-related cryptographic operations beyond UI representations (e.g., mnemonic encryption via Web Crypto). No backend is connected; all data is managed in the browser's local storage for persistence during interaction.

## Key Features (Represented in UI)

*   `[✔️]` **User Identity Simulation:** Simulates user accounts for interactions.
*   `[✔️]` **Escrow Creation & Lifecycle Management:** Users can create escrows, define terms, amount, and observe escrows progressing through various states (Pending Funding, Active, Disputed, Completed, etc.).
*   `[✔️]` **Secure Chat Log per Escrow:** A dedicated chat for buyer, seller (and arbiter) communication within each escrow.
*   `[✔️]` **Dispute Resolution Flow:** UI elements for initiating disputes and simulating arbiter actions (ruling for buyer/seller, split).
*   `[✔️]` **Monero Wallet Management Interface:**
    *   `[✔️]` Generating mnemonic seeds.
    *   `[✔️]` Displaying private/public keys derived from these seeds.
    *   `[✔️]` Encryption/decryption of the mnemonic using Web Crypto API and a user password.
    *   `[✔️]` Restoration from a mnemonic.
    *   `[✔️]` Node connection status, balance checks, and transaction scanning interfaces.
*   `[✔️]` **Timelock Mechanism & Default Outcomes:** Escrows have timers, and default outcomes (e.g., refund to buyer, release to seller) are applied on expiry.
*   `[✔️]` **Responsive Design:** The UI is built to be usable across different screen sizes.
*   `[✔️]` **Notification System:** In-app notifications for actions and alerts.
*   `[✔️]` **Two-Factor Authentication (TOTP Interface):** UI for setting up and verifying TOTP for enhanced account security (wallet unlock).
*   `[✔️]` **Evidence Submission & Review:** Chat messages can be marked as evidence, and there's a dedicated tab to review such items.
*   `[✔️]` **Arbiter Dashboard:** A separate view for an arbiter to see assigned disputes.

## Frontend Technologies Used

*   **React 19** (via esm.sh CDN)
*   **TypeScript**
*   **Tailwind CSS v2** (via CDN) for styling
*   **Lucide Icons** for iconography
*   **React Router (HashRouter)** for client-side routing
*   ES Modules with `importmap` for browser-native module handling

## How to View

1.  Ensure all project files (`index.html`, `index.tsx`, `App.tsx`, `types.ts`, and all files in `components/`, `pages/`, `hooks/`, `utils/` directories) are in the correct structure.
2.  Open the `index.html` file in a modern web browser that supports ES Modules and `importmap`.
3.  Interact with the UI to explore the features. No setup or compilation is needed beyond having the files.

## Critical Disclaimers

*   **FUNCTIONALITY SCOPE:** This application is a frontend interface. Backend and blockchain integrations are not implemented in this version.
*   **NO REAL CRYPTOCURRENCY:** It does not handle real Monero or any other cryptocurrency.
*   **NO REAL KEYS:** Private keys shown are for illustrative purposes only and are not cryptographically secure or usable. **Never use real private keys or mnemonics in this interface.**
*   **NO BACKEND / DECENTRALIZATION:** There is no actual backend server or blockchain integration. All operations are simulated client-side.
*   **SECURITY:** While security concepts are explored (like TOTP, mnemonic encryption), this frontend interface itself is not a secure environment for handling real sensitive data without a corresponding secure backend.

## Future Development

Refer to `ROADMAP.md` for a detailed plan on future development phases, including backend integration, real Monero operations, and arbiter system enhancements.

## Project Structure Overview

*   `[✔️]` `index.html`: Main HTML entry point, includes `importmap` and basic styles.
*   `[✔️]` `index.tsx`: React application bootstrap, renders the `App` component.
*   `[✔️]` `App.tsx`: Main application component, handles routing, global state management (escrows, user profile, notifications) using `useLocalStorage` hook.
*   `[✔️]` `components/`: Contains reusable UI components:
    *   `[✔️]` `Layout.tsx`: Main page structure (Navbar, content area, Footer).
    *   `[✔️]` `Navbar.tsx`: Top navigation bar, includes link to AccountModal.
    *   `[✔️]` `Footer.tsx`: Application footer.
    *   `[✔️]` `EscrowCard.tsx`: Displays summary information for an escrow on the dashboard.
    *   `[✔️]` `EscrowTimer.tsx`: Displays a countdown timer for escrows.
    *   `[✔️]` `NotificationArea.tsx`: Displays global notifications.
    *   `[✔️]` `modals/`: Directory for modal dialog components:
        *   `[✔️]` `AccountModal.tsx`: Manages user profile settings, wallet (mnemonic, keys, TOTP), and node interactions.
        *   `[✔️]` `CreateEscrowModal.tsx`: Form for creating new escrows.
        *   `[✔️]` `ConfirmActionModal.tsx`: Generic modal for confirming critical actions.
        *   `[✔️]` `SystemMonitorModal.tsx`: Displays system performance metrics.
*   `[✔️]` `pages/`: Contains top-level page components rendered by the router:
    *   `[✔️]` `DashboardPage.tsx`: Displays a list of escrows, search/filter controls.
    *   `[✔️]` `EscrowDetailPage.tsx`: Shows detailed information for a specific escrow, chat log, evidence, and action buttons.
    *   `[✔️]` `AccountPage.tsx`: A wrapper page that primarily presents the `AccountModal`.
    *   `[✔️]` `ArbiterDashboardPage.tsx`: Dashboard for an arbiter to view assigned disputes.
*   `[✔️]` `hooks/`: Custom React hooks.
    *   `[✔️]` `useLocalStorage.ts`: Hook for persisting state to local storage.
*   `[✔️]` `types.ts`: TypeScript type definitions for data structures (Escrow, UserProfile, ChatMessage, etc.).
*   `[✔️]` `utils/helpers.ts`: Utility functions (ID generation, date formatting, Monero RPC call simulations, mnemonic encryption/decryption).
*   `[✔️]` `ROADMAP.md`: Document outlining future development tasks and phases.
*   `[✔️]` `ServerSecurity.md`: Discussion of security considerations for a hypothetical arbiter server.
*   `[✔️]` `STUBS.md`: Outlines backend functionalities needed for a full system.
*   `[✔️]` `README.md`: This file.
*   `[✔️]` `metadata.json`: Project metadata.