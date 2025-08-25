export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "agronomist";
  status?: "active" | "pending" | "suspended";
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  emailVerified?: boolean;
}

export interface CreateUserInput {
  username: string;
  email: string;
  role: "admin" | "agronomist";
  status?: "active" | "pending" | "suspended";
  phone?: string;
  password?: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: "admin" | "agronomist";
  status?: "active" | "pending" | "suspended";
  phone?: string;
  password?: string;
  isActive?: boolean;
}