import { api } from "@/lib/api/client";
import type { CustomerProfile, UpdateProfileInput } from "@/features/profile/types";

export async function getProfile(): Promise<CustomerProfile> {
  return api.get<CustomerProfile>("/users/profile/api/getprofile");
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<CustomerProfile> {
  const data = await api.patch<{ user?: CustomerProfile }>("/users/profile/api/editprofile", {
    body: input,
  });
  return data.user as CustomerProfile;
}