import { Request, Response, NextFunction } from "express";
import * as providerService from "../services/provider.service.js";
import { AuthenticatedRequest } from "../types/index.js";

// ============================================================================
// PROVIDER PROFILE (owner)
// ============================================================================

export async function createProvider(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const provider = await providerService.createProvider(
      req.user!.userId,
      req.body,
    );
    res.status(201).json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
}

export async function updateProvider(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const provider = await providerService.updateProvider(
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
}

export async function getMyProvider(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const provider = await providerService.getProviderByUserId(
      req.user!.userId,
    );
    res.json({ success: true, data: provider });
  } catch (error: any) {
    // Return null instead of 404 so the frontend can show onboarding
    if (error?.statusCode === 404) {
      res.json({ success: true, data: null });
      return;
    }
    next(error);
  }
}

// ============================================================================
// PUBLIC PROVIDER VIEWS
// ============================================================================

export async function getProviderById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const provider = await providerService.getProviderById(req.params.id);
    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
}

export async function searchProviders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await providerService.searchProviders(req.query as any);
    res.json({
      success: true,
      data: { providers: result.providers, meta: result.meta },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// SERVICES
// ============================================================================

export async function addService(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const service = await providerService.addService(
      req.user!.userId,
      req.body,
    );
    res.status(201).json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
}

export async function updateService(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const service = await providerService.updateService(
      req.user!.userId,
      req.params.serviceId,
      req.body,
    );
    res.json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
}

export async function deleteService(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await providerService.deleteService(req.user!.userId, req.params.serviceId);
    res.json({ success: true, message: "Service deleted" });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export async function setAvailability(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const availability = await providerService.setAvailability(
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// SERVICE SLOTS
// ============================================================================

export async function setServiceSlots(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const slots = await providerService.setServiceSlots(
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
}

export async function getServiceSlots(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const slots = await providerService.getServiceSlots(
      req.user!.userId,
      req.params.serviceId,
    );
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// PRICING SETTINGS
// ============================================================================

export async function updatePricingSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const provider = await providerService.updatePricingSettings(
      req.user!.userId,
      req.body,
    );
    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// STATS & CLIENTS
// ============================================================================

export async function getStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await providerService.getProviderStats(req.user!.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function getClients(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await providerService.getProviderClients(
      req.user!.userId,
      page,
      limit,
    );
    res.json({
      success: true,
      data: { clients: result.clients, meta: result.meta },
    });
  } catch (error) {
    next(error);
  }
}
