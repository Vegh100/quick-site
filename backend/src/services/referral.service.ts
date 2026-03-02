import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { AppError, NotFoundError } from "../lib/errors.js";

// ============================================================================
// GENERATE REFERRAL CODE
// ============================================================================

function generateReferralCode(): string {
  // 8 char alphanumeric uppercase code: e.g. "QVCK4X7F"
  return "QVCK" + crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
}

// ============================================================================
// GET OR CREATE REFERRAL CODE (for current user)
// ============================================================================

export async function getMyReferral(userId: string) {
  // Check if user already has a pending referral code
  let referral = await prisma.referral.findFirst({
    where: { senderId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  // If not, create one
  if (!referral) {
    let code = generateReferralCode();
    let attempts = 0;

    // Ensure code is unique
    while (attempts < 5) {
      const existing = await prisma.referral.findUnique({ where: { code } });
      if (!existing) break;
      code = generateReferralCode();
      attempts++;
    }

    referral = await prisma.referral.create({
      data: {
        senderId: userId,
        code,
        status: "PENDING",
      },
    });
  }

  // Get stats
  const stats = await getReferralStats(userId);

  return {
    referral,
    stats,
    shareUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}?ref=${referral.code}`,
  };
}

// ============================================================================
// REDEEM REFERRAL CODE
// ============================================================================

export async function redeemReferral(userId: string, code: string) {
  const referral = await prisma.referral.findUnique({
    where: { code },
  });

  if (!referral) throw new NotFoundError("Referral code");

  if (referral.status !== "PENDING") {
    throw new AppError("Ez a meghívó kód már felhasználásra került", 400);
  }

  if (referral.senderId === userId) {
    throw new AppError("Nem használhatod a saját meghívó kódodat", 400);
  }

  // Check if this user has already redeemed any referral
  const alreadyRedeemed = await prisma.referral.findFirst({
    where: { receiverId: userId, status: "REDEEMED" },
  });

  if (alreadyRedeemed) {
    throw new AppError("Már felhasználtál egy meghívó kódot korábban", 400);
  }

  // Redeem the referral
  const updated = await prisma.referral.update({
    where: { id: referral.id },
    data: {
      receiverId: userId,
      status: "REDEEMED",
      redeemedAt: new Date(),
    },
    include: {
      sender: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Create a new pending referral code for the sender (so they can invite again)
  let newCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.referral.findUnique({ where: { code: newCode } });
    if (!existing) break;
    newCode = generateReferralCode();
    attempts++;
  }

  await prisma.referral.create({
    data: {
      senderId: referral.senderId,
      code: newCode,
      status: "PENDING",
    },
  });

  return updated;
}

// ============================================================================
// GET REFERRAL STATS
// ============================================================================

export async function getReferralStats(userId: string) {
  const [totalSent, totalRedeemed] = await Promise.all([
    prisma.referral.count({ where: { senderId: userId } }),
    prisma.referral.count({
      where: { senderId: userId, status: "REDEEMED" },
    }),
  ]);

  // Get list of who redeemed
  const redeemed = await prisma.referral.findMany({
    where: { senderId: userId, status: "REDEEMED" },
    include: {
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { redeemedAt: "desc" },
    take: 10,
  });

  return {
    totalSent,
    totalRedeemed,
    pendingCount: totalSent - totalRedeemed,
    recentRedeemed: redeemed.map((r) => ({
      id: r.id,
      redeemedAt: r.redeemedAt,
      receiver: r.receiver,
    })),
  };
}
