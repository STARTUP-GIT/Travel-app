import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import prisma from "../../../../db/prisma.js";
import { common_guide_signupSchema } from "../../../../services/zod.js";
import { authProviders } from "../../../../generated/client/enums.js";
import { generateSessionToken } from "../../../../services/sessiontoken.js";




export const signUp = async (req: Request, res: Response) => {
  try {
    const {
      email,
      username,
      password,
      fullname,
    } = common_guide_signupSchema.parse(req.body);


    const common_guide_exists = await prisma.common_guide.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (common_guide_exists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    // Create specific guide
    const common_guide = await prisma.common_guide.create({
      data: {
        email,
        username,
        password: hashedPassword,
        full_name: fullname,
        phonenumber : "",
        profile_pic : "",
        experience :0,
        cost : 0,
        language :[],
        authprovider: authProviders.EMAIL,
      },
    });

    return res.status(201).json({
      message: "Specific guide created successfully",
      common_guide,
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
  }  
};


export const googleSignUp = async (req: Request, res: Response) => {
  try {
    const {
      email,
      fullname,
      profilepic,
      placeid,
      phonenumber,
      experience,
      cost,
      language,
    } = req.body;

    // Required fields
    if (!email || !fullname || !placeid) {
      return res.status(400).json({
        message: "Email, name and place are required",
      });
    }

    // Check whether account already exists
    const common_guide_exists = await prisma.common_guide.findUnique({
      where: {
        email,
      },
    });

    // Do not create another account
    if (common_guide_exists) {
      return res.status(409).json({
        message:
          "Account already exists",
      });
    }

    // Generate username from Google email
    const baseUsername =
      email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "") || "guide";

    let username = baseUsername;

    // Check username collision
    const usernameExists =
      await prisma.common_guide.findUnique({
        where: {
          username,
        },
      });

    if (usernameExists) {
      username = `${baseUsername}_${Date.now()}`;
    }

    // Create Google guide
    const common_guide = await prisma.common_guide.create({
      data: {
        email,
        full_name: fullname,
        username,
        profile_pic: profilepic ?? "",
        phonenumber: phonenumber ?? "",
        password: "",
        experience: experience ?? 0,
        cost: cost ?? 0,
        language: language ?? [],
        authprovider: authProviders.GOOGLE,
      },
    });

    return res.status(201).json({
      message:
        "account created successfully.",
      common_guide,
    });

  } catch (error) {
    console.error("Google signup error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};



export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = common_guide_signupSchema.parse(req.body);

  
    const common_guide_exists = await prisma.common_guide.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (!common_guide_exists) {
      return res.status(400).json("user does not exist")
    }

    if (!common_guide_exists.password) {
      return res.status(400).json("Invalid password");
    }

    const isPasswordValid = await bcrypt.compare(password, common_guide_exists.password);
    if (!isPasswordValid) {
      return res.status(400).json("Invalid password")
    }

    const token = generateSessionToken(common_guide_exists.id);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' });

    res.status(200).json({ message: "User signed in successfully", token });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
  }
};



export const googleSignIn = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Google email is required",
      });
    }

    // Find existing guide using email
    const common_guide_exists = await prisma.common_guide.findUnique({
      where: {
        email,
      },
    });

    // Account doesn't exist
    if (!common_guide_exists) {
      return res.status(404).json({
        message:
          "Account does not exist.",
      });
    }

    // Generate JWT
    const token = generateSessionToken(common_guide_exists.id);

    // Store JWT in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Google signin successful",
      token,
    });

  } catch (error) {
    console.error("Google signin error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};



export const signOut = async (req: Request,res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "User signed out successfully",
    });

  } catch (error) {
    console.error("Sign out error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};