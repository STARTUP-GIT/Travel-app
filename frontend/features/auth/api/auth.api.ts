import { api } from "@/lib/api/client";

export type SignupInput = {
  email: string;
  username: string;
  password: string;
  fullname: string;
  phonenumber: string;
};

type MessageResponse = { message?: string };

export async function signupWithEmail(input: SignupInput): Promise<void> {
  await api.post<MessageResponse>("/users/api/auth/signup", {
    body: {
      email: input.email,
      username: input.username,
      password: input.password,
      fullname: input.fullname,
      phonenumber: input.phonenumber,
      provider: "email",
    },
  });
}