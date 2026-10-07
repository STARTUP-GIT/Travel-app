import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const handleError = (res: Response, error: unknown) => {
  console.error("Coupon error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

function prismaCode(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && typeof (e as { code?: unknown }).code === "string"
    ? (e as { code: string }).code
    : undefined;
}

/** GET /api/admin/coupons */
export const listCoupons = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const activeOnly = req.query.active === "true";
    const coupons = await prisma.coupon.findMany({
      where: {
        ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ coupons });
  } catch (error) {
    return handleError(res, error);
  }
};

/** GET /api/admin/coupons/:id */
export const getCouponById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    return res.status(200).json({ coupon });
  } catch (error) {
    return handleError(res, error);
  }
};

/** POST /api/admin/coupons */
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const { code, description, discountPct, maxUses, isActive, expiresAt } = req.body ?? {};
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ message: "code is required" });
    }
    if (typeof discountPct !== "number" || discountPct <= 0 || discountPct > 100) {
      return res.status(400).json({ message: "discountPct must be a number between 1 and 100" });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description: typeof description === "string" ? description : "",
        discountPct,
        maxUses: typeof maxUses === "number" && maxUses > 0 ? maxUses : null,
        isActive: typeof isActive === "boolean" ? isActive : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return res.status(201).json({ message: "Coupon created", coupon });
  } catch (error) {
    const code = prismaCode(error);
    if (code === "P2002") {
      return res.status(409).json({ message: "A coupon with this code already exists." });
    }
    return handleError(res, error);
  }
};

/** PATCH /api/admin/coupons/:id */
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { code, description, discountPct, maxUses, isActive, expiresAt } = req.body ?? {};

    const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Coupon not found" });

    const data: Record<string, unknown> = {};
    if (typeof code === "string" && code.trim()) data.code = code.trim().toUpperCase();
    if (typeof description === "string") data.description = description;
    if (typeof discountPct === "number" && discountPct > 0 && discountPct <= 100) data.discountPct = discountPct;
    if (maxUses === null) data.maxUses = null;
    else if (typeof maxUses === "number" && maxUses > 0) data.maxUses = maxUses;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (expiresAt === null) data.expiresAt = null;
    else if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);

    if (Object.keys(data).length === 0) return res.status(400).json({ message: "Nothing to update" });

    const coupon = await prisma.coupon.update({ where: { id }, data });
    return res.status(200).json({ message: "Coupon updated", coupon });
  } catch (error) {
    const code = prismaCode(error);
    if (code === "P2002") {
      return res.status(409).json({ message: "A coupon with this code already exists." });
    }
    return handleError(res, error);
  }
};

/** DELETE /api/admin/coupons/:id */
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const existing = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Coupon not found" });
    await prisma.coupon.delete({ where: { id } });
    return res.status(200).json({ message: "Coupon deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};
