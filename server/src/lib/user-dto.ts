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

type UserDtoSource = Pick<User, "id" | "name" | "email" | "role" | "isActive" | "mustChangePassword">;

export function toUserDto(user: UserDtoSource): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

// api-spec.md 9.1 row shape, Administrator user management (#43). The same
// six keys as UserDto plus createdAt and updatedAt - still never passwordHash
// and nothing derived from it (BR-88, FR-70).
export interface AdminUserDto extends UserDto {
  createdAt: Date;
  updatedAt: Date;
}

// The parameter type names only the columns a DTO actually uses, never the
// full Prisma `User` model - so a `select` that leaves passwordHash out
// (every admin route's query does) still satisfies it. passwordHash is never
// even queried for these routes, not just never returned (BR-88).
export function toAdminUserDto(user: UserDtoSource & Pick<User, "createdAt" | "updatedAt">): AdminUserDto {
  return { ...toUserDto(user), createdAt: user.createdAt, updatedAt: user.updatedAt };
}
