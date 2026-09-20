import type { Request, Response } from 'express';
import prisma from '../../../../db/prisma.js';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { userProfileUpdateSchema } from '../../../../services/zod.js';

const userSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phonenumber: true,
  profilepic: true,
  authprovider: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getProfile = async (req: Request, res: Response) => {
    try {
        const  userId  = req.userId;

        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findFirst({
            where : {
                id: userId
            },
            select: userSafeSelect,
        })

        if(!user){
            return res.status(404).json({
                message: "User not found",
             });
        }

        return res.json(user)

    } catch (error) {
        console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
    }
}


export const editProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = userProfileUpdateSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingUseremail = await prisma.user.findFirst({
      where: {
         ...(data.email !== undefined ? { email: data.email } : {}),
      },
    });

    const existingUserusername = await prisma.user.findFirst({
      where: {
        ...(data.username !== undefined ? { username: data.username } : {}),
      },
    });

    if(existingUseremail && existingUseremail.id !== userId){
      return res.status(400).json({
        message: "Email already exists",
      });
    }


    if (existingUserusername && existingUserusername.id !== userId) {
        return res.status(400).json({
            message: "Username already exists",
        });
    }

    let hashedPassword: string | undefined;

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(data.password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phonenumber !== undefined ? { phonenumber: data.phonenumber } : {}),
        ...(data.profilepic !== undefined ? { profilepic: data.profilepic } : {}),
        ...(hashedPassword !== undefined ? { password: hashedPassword } : {}),
      },
      select: userSafeSelect,
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
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

    console.error("Edit profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};


export const  deleteProfile = async (req: Request , res:Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        });

        if (!user) {
        return res.status(404).json({
            message: "User not found",
        });
        }

        await prisma.user.delete({
            where :{
                id : userId
            }
        })

        return res.status(200).json({
            message : " Profile Delected Successfully"
        });
    } 
    catch (error) {
        console.error("Delete profile error:", error);

        return res.status(500).json({
        message: "Internal Server Error",
        });
    }
}