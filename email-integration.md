# Outlook email integration

The CRM email interface supports individual contacts, event audiences, saved segments, templates, drafts and multi-step campaigns. External sending is intentionally disabled in the preview.

## Production flow

1. A team member connects their Workgroup Microsoft 365 account using the Microsoft identity platform authorization-code flow.
2. The server requests delegated `Mail.Send`, `Mail.Read`, `User.Read` and `offline_access` permissions. Add `Mail.ReadWrite` only if the CRM later manages Outlook drafts, folders or message state.
3. Refresh tokens are encrypted and stored server-side. They are never returned to the browser or stored in local storage.
4. The CRM expands the chosen event segment into individual recipients and freezes a delivery snapshot.
5. Personalisation fields are resolved separately for each recipient.
6. A server-side function calls Microsoft Graph `POST /me/sendMail`.
7. The Microsoft message identifier, status and timestamps are recorded against the contact, event and campaign.
8. Sent messages can subsequently be read through Microsoft Graph and displayed in the contact activity history.

## Automatic contact capture

Mailbox synchronisation uses Microsoft Graph message delta queries for Inbox and Sent Items, so only changes since the previous sync are processed.

- Add a new contact when the connected account sends to or replies to an external person.
- Ignore newsletters, automated/no-reply addresses, distribution lists and internal Workgroup addresses.
- Match existing contacts by normalised email before creating anything.
- Set the connected account holder as the contact owner.
- Use the email domain to match or suggest the organisation, then queue its logo and company details for enrichment.
- Add the source message as relationship activity with its Microsoft message ID, timestamp and subject.
- Keep the delta cursor per connected mailbox folder so messages are not imported twice.

## Safety rules

- Every recipient receives a separate message; recipient addresses are not exposed to one another.
- Sending requires an explicit final confirmation showing the audience and recipient count.
- Records without a usable email address are excluded and reported before sending.
- Suppressed or unsubscribed contacts are excluded from marketing campaigns.
- A campaign stores a fixed recipient snapshot so later segment changes do not alter an in-progress send.
- Retries use idempotency keys to avoid accidental duplicate emails.
- Microsoft access and refresh tokens remain server-side.

## Required hosted configuration

- Microsoft Entra tenant ID
- Application client ID
- Application client secret
- Exact production OAuth callback URL
- Supabase secrets for encrypting or vaulting refresh tokens
- Supabase Edge Functions for OAuth callback, token refresh, draft creation, sending and mailbox synchronisation
