# Security Specification - Gestão de Históricos Escolares

## Data Invariants
1. Students always start with status 'PENDENTE'.
2. Only 'CONCLUIDO' students can have a PDF generated (enforced by UI, but status must be consistent).
3. Grades must be linked to a valid student.
4. Audit logs must capture the user ID.
5. Critical fields (RA, Aluno) must not be empty.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Unauthenticated Write**: Attempting to create a student without being logged in.
2. **Identity Spoofing**: User A trying to update User B's profile.
3. **Invalid Status**: Setting status to something other than PENDENTE or CONCLUIDO.
4. **Missing Required Fields**: Creating a student without 'aluno' or 'status'.
5. **ID Poisoning**: Injecting 2KB string as student ID.
6. **Graceful Degradation Attack**: Attempting to set 'updatedAt' to a past date.
7. **Orphaned Grades**: Creating a grade for a non-existent student (difficult to enforce strictly in rules without costs, but we check path).
8. **Malicious Schema Injection**: Adding 'isAdmin: true' to a student document.
9. **Bulk Deletion**: Authenticated user trying to delete all students (we restrict delete to specific conditions or admins).
10. **Timestamp Spoofing**: Providing a client-side timestamp for `updatedAt` instead of server-side.
11. **Email Unverified**: User with unverified email attempting writes (if we enforce email verification).
12. **Shadow Updates**: Updating a student but ignoring `lastModifiedBy` fields.

## Test Runner (Logic Overview)
The `firestore.rules` will be tested via ESLint and manual logic verification against these cases.
Specific focus on `affectedKeys().hasOnly()` during updates to prevent field injection.
