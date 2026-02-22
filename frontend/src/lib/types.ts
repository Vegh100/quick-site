// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole = "CUSTOMER" | "PROVIDER" | "EMPLOYEE" | "ADMIN";

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

export type MemberRole = "OWNER" | "EMPLOYEE";
export type MemberStatus = "INVITED" | "ACTIVE" | "DEACTIVATED";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ServiceType {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  defaultDurationMin: number;
  sortOrder: number;
  isActive: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  };
}

export interface SlotMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availableMembers?: SlotMember[];
}

export interface ProviderCategory {
  providerId: string;
  categoryId: string;
  category: Category;
}

export interface Service {
  id: string;
  providerId: string;
  serviceTypeId: string | null;
  name: string;
  description: string | null;
  priceAmount: string; // Decimal as string
  priceCurrency: string;
  priceType: "PER_HOUR" | "FIXED" | "PER_SERVICE";
  durationMin: number;
  slotIntervalMin: number;
  isActive: boolean;
  sortOrder: number;
  serviceType?: ServiceType;
  serviceSlots?: { dayOfWeek: number; memberId: string }[];
}

export interface Availability {
  id: string;
  providerId: string;
  memberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export interface ServiceSlot {
  id: string;
  serviceId: string;
  memberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
  taxNumber: string | null;
  regNumber: string | null;
  county: string | null;
  city: string | null;
  address: string | null;
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
  members?: ProviderMember[];
  subscription?: Subscription | null;
}

export interface ProviderMember {
  id: string;
  providerId: string;
  userId: string | null;
  role: MemberRole;
  status: MemberStatus;
  invitedEmail: string;
  displayName: string | null;
  inviteToken?: string | null;
  invitedAt: string;
  joinedAt: string | null;
  user?: {
    id: string;
    email?: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  provider?: {
    id: string;
    businessName: string;
    logoUrl?: string | null;
  };
  memberServices?: MemberService[];
  availability?: Availability[];
}

export interface MemberBookingStats {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
}

export interface MemberDetail extends ProviderMember {
  bookingStats: MemberBookingStats;
  upcomingBookings: Booking[];
  recentBookings: Booking[];
}

export interface MemberService {
  id: string;
  memberId: string;
  serviceId: string;
  service?: Service;
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
  assignedMemberId: string | null;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  scheduledEndTime: string | null;
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
  assignedMember?: {
    id: string;
    displayName: string | null;
    role: MemberRole;
    user?: {
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
  } | null;
  address?: Address;
  reviews?: Review[];
}

export interface CreateBookingInput {
  providerId: string;
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
  addressId?: string;
  assignedMemberId?: string;
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
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string | null;
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
  confirmedBookings: number;
  cancelledBookings: number;
  inProgressBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  totalClients: number;

  // Period comparisons
  thisMonthBookings: number;
  lastMonthBookings: number;
  bookingChange: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueChange: number;
  thisWeekBookings: number;

  // KPIs
  completionRate: number;
  avgBookingValue: number;
  avgDuration: number;

  // Chart data
  revenueByMonth: { month: string; revenue: number }[];
  dailyData: { date: string; revenue: number; bookings: number }[];
  serviceBreakdown: {
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
  }[];
  memberStats: {
    memberId: string;
    memberName: string;
    bookingCount: number;
    revenue: number;
  }[];
  statusBreakdown: {
    status: string;
    count: number;
    label: string;
  }[];
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
