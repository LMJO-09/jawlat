# Security Specification for Nizam Al-Jawlat

## 1. Data Invariants
- A user cannot modify their own `role`, `isBlocked`, or `restrictedActions`.
- Users can only read `User` documents of others if they are `isAdmin`. Standard users can only read their own profile.
- Rounds can be created by any unblocked user.
- Round messages can only be sent by round participants during break periods (handled via logic).
- Support tickets are readable only by the sender and admins.
- `abdalrhmanmaaith24@gmail.com` is the system admin.

## 2. The Dirty Dozen (Attacking Payloads)

1. **Self-Promotion**: User attempts to update `role: 'admin'` on their own profile.
2. **Shadow Block Bypass**: User attempts to set `isBlocked: false` on their own profile after being blocked.
3. **Ghost Round Create**: Unauthenticated user attempts to create a round.
4. **Id Poisoning**: User creates a round with a 1MB ID string.
5. **PII Leak**: Standard user attempts to list all users' emails.
6. **Chat Spoof**: User sends a message with another user's `senderId`.
7. **Timestamp Fraud**: User creates a round with a `startTime` in the future or past from the client.
8. **Action Restriction Bypass**: User with `restrictedActions: ['chat']` attempts to write to `rounds/{id}/messages`.
9. **Support Hijack**: User attempts to read a support ticket created by someone else.
10. **Admin Impersonation**: User sends a message with `senderRole: 'admin'` to get a gold name.
11. **Content Overwrite**: User attempts to update `creatorId` of someone else's content.
12. **Flame Fraud**: User attempts to manually set `hasFlame: true` without participating in a round.

## 3. Test Cases (Mental Audit)
- `users/{uid}`: `write` should fail if `request.resource.data.role` changed and `!isAdmin()`.
- `rounds/{id}`: `create` should verify `incoming().creatorId == request.auth.uid`.
- `rounds/{id}/messages`: `create` should fail if `user.restrictedActions.hasAny(['chat'])`.
