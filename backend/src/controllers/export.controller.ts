import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/index.js";
import * as exportService from "../services/export.service.js";

export async function exportBookingsCsv(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const csv = await exportService.exportBookingsCsv(req.user!.userId, req.query as any);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="foglalasok_${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function getRevenueSummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { dateFrom, dateTo } = req.query as {
      dateFrom: string;
      dateTo: string;
    };

    if (!dateFrom || !dateTo) {
      res.status(400).json({ success: false, error: "dateFrom and dateTo are required" });
      return;
    }

    const summary = await exportService.getRevenueSummary(req.user!.userId, dateFrom, dateTo);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}
