import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type ValidateTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidateTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(
          (e) => `${e.path.join(".")}: ${e.message}`,
        );
        _res.status(400).json({
          success: false,
          error: "Validation failed",
          details: messages,
        });
        return;
      }
      next(error);
    }
  };
}
