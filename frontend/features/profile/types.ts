export type AuthProvider = "GOOGLE" | "EMAIL";

export type CustomerProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  phonenumber: string;
  profilepic?: string | null;
  authprovider?: AuthProvider | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateProfileInput = {
  name?: string;
  username?: string;
  email?: string;
  phonenumber?: string;
  profilepic?: string;
  password?: string;
};