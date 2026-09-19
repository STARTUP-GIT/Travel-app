

import type { Request, Response } from 'express';
import prisma from '../../../../db/prisma.js';
import { use } from 'react';
import bcrypt from 'bcryptjs';

export const getProfile = async (req: Request, res: Response) => {
    try {
        const  userId  = req.userId;

        const user = await prisma.user.findFirst({
            where : {
                id: userId
            }
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

    const { name, username, phonenumber, profilepic ,password,email } = req.body;

    const existingUseremail = await prisma.user.findFirst({
      where: {
         email
      },
    });

    const existingUserusername = await prisma.user.findFirst({
      where: {
        username,
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

    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name,
        username,
        email,
        phonenumber,
        profilepic,
        ...(hashedPassword && {
          password: hashedPassword,
        }),
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Edit profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};


export const  deleteProfile = async (req: Request , res:Response) => {
    try {
        const userId = req.userId;

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

