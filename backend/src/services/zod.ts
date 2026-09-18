import  z from "zod"; 
 
export const usersignupSchema = z.object({ 
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
  phonenumber:z.string().min(10).max(15),
  provider: z.enum(["google", "email"])
});



export const specific_guide_signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
  phonenumber: z.string().min(10).max(15),
  provider: z.enum(["google", "email"]),
  profile_pic: z.string().optional(),
  placeid: z.string(),
  experience: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  language: z.array(z.string().min(1)).min(1),
});
export const common_guide_signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
  phonenumber: z.string().min(10).max(15),
  provider: z.enum(["google", "email"]),
  profile_pic: z.string().optional(),
  placeid: z.array(z.string().min(2)),
  experience: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  language: z.array(z.string().min(1)).min(1),
});