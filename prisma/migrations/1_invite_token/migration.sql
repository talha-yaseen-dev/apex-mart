-- AlterEnum
-- Adds the INVITE token type used when an admin invites a new teammate to set
-- their own password (lib/actions/access.ts → inviteMemberAction).
ALTER TYPE "TokenType" ADD VALUE 'INVITE';
