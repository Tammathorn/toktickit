import type { User } from "@prisma/client";

// api-spec.md 10.1 - the authenticated identity, returned by login, current
// user and change-password. Exactly six keys, picked one by one rather than
// spread from the row, so a column added to User later can never reach a
// response by accident. Never passwordHash, never a token, never a session id
// (BR-10, BR-33, BR-88).
export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: User["role"];
  isActive: boolean;
  mustChangePassword: boolean;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}
