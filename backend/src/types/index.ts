import { Request } from "express";
import { UserRole } from "@prisma/client";

// ============================================================================
// AUTH
// ============================================================================

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface ProviderSearchFilters {
  categorySlug?: string;
  search?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
  isVerified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "rating" | "price" | "reviewCount" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// BOOKING
// ============================================================================

export interface BookingFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// STATS
// ============================================================================

export interface ProviderStats {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  totalClients: number;
  revenueByMonth: { month: string; revenue: number }[];
}
