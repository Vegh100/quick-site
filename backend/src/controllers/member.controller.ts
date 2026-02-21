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

export async function assignService(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await memberService.assignService(
      req.user!.userId,
      req.params.memberId,
      req.body.serviceId,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function removeService(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await memberService.removeService(
      req.user!.userId,
      req.params.memberId,
      req.params.serviceId,
    );
    res.json({ success: true, message: "Service assignment removed" });
  } catch (error) {
    next(error);
  }
}

export async function setMemberAvailability(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const availability = await memberService.setMemberAvailability(
      req.user!.userId,
      req.params.memberId,
      req.body.availability,
    );
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
}

export async function getInviteInfo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const info = await memberService.getInviteInfo(req.params.token);
    res.json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
}

export async function getMemberDetail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const detail = await memberService.getMemberDetail(
      req.user!.userId,
      req.params.memberId,
    );
    res.json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
}
