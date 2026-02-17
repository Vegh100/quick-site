// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    isNewUser?: boolean;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ProviderCategory {
  providerId: string;
  categoryId: string;
  category: Category;
}

export interface Service {
  id: string;
  providerId: string;
  name: string;
  description: string | null;
  priceAmount: string; // Decimal as string
  priceCurrency: string;
  priceType: "PER_HOUR" | "FIXED" | "PER_SERVICE";
  durationMin: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Availability {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export interface Provider {
  id: string;
  userId: string;
  businessName: string;
  description: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  serviceArea: string | null;
  teamSize: string | null;
  taxNumber: string | null;
  regNumber: string | null;
  rating: string; // Decimal
  reviewCount: number;
  isVerified: boolean;
  onboardingDone: boolean;
  dynamicPricing: boolean;
  weekendPremium: boolean;
  weekendPremiumPercent: number;
  autoAccept: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email?: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  categories?: ProviderCategory[];
  services?: Service[];
  availability?: Availability[];
  subscription?: Subscription | null;
}

export interface Subscription {
  id: string;
  providerId: string;
  plan: "STARTER" | "PRO" | "BUSINESS_PLUS";
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  durationMin: number;
  totalAmount: string;
  currency: string;
  notes: string | null;
  addressId: string | null;
  cancelReason: string | null;
  completedAt: string | null;
  createdAt: string;
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    email?: string;
  };
  provider?: Provider;
  service?: Service;
  address?: Address;
}

export interface CreateBookingInput {
  providerId: string;
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
  addressId?: string;
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}

// ============================================================================
// ADDRESS TYPES
// ============================================================================

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

// ============================================================================
// FAVORITE TYPES
// ============================================================================

export interface Favorite {
  id: string;
  userId: string;
  providerId: string;
  provider?: Provider;
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export interface NotificationPreference {
  emailBookings: boolean;
  emailMessages: boolean;
  emailPromotions: boolean;
  smsBookings: boolean;
  smsReminders: boolean;
  pushEnabled: boolean;
}

// ============================================================================
// STATS TYPES
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

export interface ProviderClient {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  bookingsAsCustomer: {
    status: BookingStatus;
    scheduledDate: string;
    totalAmount: string;
  }[];
}

// ============================================================================
// PAGINATION
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    meta: PaginationMeta;
  };
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
