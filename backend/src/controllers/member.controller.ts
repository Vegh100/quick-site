import { Response, NextFunction } from "express";
import * as memberService from "../services/member.service.js";
import { AuthenticatedRequest } from "../types/index.js";

export async function inviteMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const member = await memberService.inviteMember(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvite(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const member = await memberService.acceptInvite(
      req.user!.userId,
      req.body.memberId,
    );
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
}

export async function listMembers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const members = await memberService.listMembers(req.user!.userId);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
}

export async function updateMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const member = await memberService.updateMember(
      req.user!.userId,
      req.params.memberId,
      req.body,
    );
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
}

export async function deactivateMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const member = await memberService.deactivateMember(
      req.user!.userId,
      req.params.memberId,
    );
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
}

export async function upgradeToCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const provider = await memberService.upgradeToCompany(req.user!.userId);
    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
}

export async function getPendingInvites(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const invites = await memberService.getPendingInvites(req.user!.email);
    res.json({ success: true, data: invites });
  } catch (error) {
    next(error);
  }
}
