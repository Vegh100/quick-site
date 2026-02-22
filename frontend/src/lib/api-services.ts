import api from "./api";
import type {
  AuthResponse,
  RegisterInput,
  LoginInput,
  User,
  Provider,
  ProviderMember,
  MemberDetail,
  Service,
  ServiceType,
  TimeSlot,
  Availability,
  ServiceSlot,
  Booking,
  CreateBookingInput,
  Review,
  Address,
  Favorite,
  NotificationPreference,
  Category,
  ProviderStats,
  ProviderClient,
  PaginationMeta,
  ApiResponse,
} from "./types";

// ============================================================================
// AUTH
// ============================================================================

export const authApi = {
  register: (data: RegisterInput) =>
    api.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  login: (data: LoginInput) =>
    api.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  googleAuth: (credential: string, role?: string) =>
    api
      .post<AuthResponse>("/auth/google", { credential, role })
      .then((r) => r.data),

  me: () => api.get<AuthResponse>("/auth/me").then((r) => r.data),

  logout: () => api.post("/auth/logout").then((r) => r.data),

  logoutAll: () => api.post("/auth/logout-all").then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api
      .post("/auth/change-password", { currentPassword, newPassword })
      .then((r) => r.data),
};

// ============================================================================
// USERS
// ============================================================================

export const userApi = {
  getProfile: () =>
    api
      .get<ApiResponse<User & { provider?: Provider }>>("/users/profile")
      .then((r) => r.data),

  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
  }) =>
    api.patch<ApiResponse<User>>("/users/profile", data).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api
      .post<ApiResponse<{ avatarUrl: string }>>(
        "/users/profile/avatar",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      )
      .then((r) => r.data);
  },

  getAddresses: () =>
    api.get<ApiResponse<Address[]>>("/users/addresses").then((r) => r.data),

  addAddress: (data: Omit<Address, "id" | "userId">) =>
    api
      .post<ApiResponse<Address>>("/users/addresses", data)
      .then((r) => r.data),

  updateAddress: (id: string, data: Partial<Omit<Address, "id" | "userId">>) =>
    api
      .patch<ApiResponse<Address>>(`/users/addresses/${id}`, data)
      .then((r) => r.data),

  deleteAddress: (id: string) =>
    api.delete(`/users/addresses/${id}`).then((r) => r.data),

  getNotificationPrefs: () =>
    api
      .get<ApiResponse<NotificationPreference>>("/users/notifications")
      .then((r) => r.data),

  updateNotificationPrefs: (data: Partial<NotificationPreference>) =>
    api
      .patch<ApiResponse<NotificationPreference>>("/users/notifications", data)
      .then((r) => r.data),
};

// ============================================================================
// PROVIDERS
// ============================================================================

export const providerApi = {
  search: (params?: {
    categorySlug?: string;
    search?: string;
    city?: string;
    minRating?: number;
    maxPrice?: number;
    isVerified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) =>
    api
      .get<ApiResponse<{ providers: Provider[]; meta: PaginationMeta }>>(
        "/providers/search",
        {
          params,
        },
      )
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<ApiResponse<Provider>>(`/providers/${id}`).then((r) => r.data),

  create: (data: {
    businessName: string;
    description?: string;
    phone?: string;
    website?: string;
    serviceArea?: string;
    taxNumber?: string;
    regNumber?: string;
    county?: string;
    city?: string;
    address?: string;
    categoryIds: string[];
  }) => api.post<ApiResponse<Provider>>("/providers", data).then((r) => r.data),

  getMyProfile: () =>
    api.get<ApiResponse<Provider>>("/providers/me/profile").then((r) => r.data),

  updateMyProfile: (data: {
    businessName?: string;
    description?: string;
    phone?: string;
    website?: string;
    serviceArea?: string;
    taxNumber?: string;
    regNumber?: string;
    county?: string;
    city?: string;
    address?: string;
    categoryIds?: string[];
  }) =>
    api
      .patch<ApiResponse<Provider>>("/providers/me/profile", data)
      .then((r) => r.data),

  addService: (data: {
    serviceTypeId?: string;
    name: string;
    description?: string;
    priceAmount: number;
    priceType: "PER_HOUR" | "FIXED" | "PER_SERVICE";
    durationMin: number;
    slotIntervalMin?: number;
  }) =>
    api
      .post<ApiResponse<Service>>("/providers/me/services", data)
      .then((r) => r.data),

  updateService: (
    serviceId: string,
    data: {
      serviceTypeId?: string;
      name?: string;
      description?: string;
      priceAmount?: number;
      priceType?: "PER_HOUR" | "FIXED" | "PER_SERVICE";
      durationMin?: number;
      slotIntervalMin?: number;
    },
  ) =>
    api
      .patch<ApiResponse<Service>>(`/providers/me/services/${serviceId}`, data)
      .then((r) => r.data),

  deleteService: (serviceId: string) =>
    api.delete(`/providers/me/services/${serviceId}`).then((r) => r.data),

  setAvailability: (
    memberId: string,
    availability: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isEnabled: boolean;
    }[],
  ) =>
    api
      .put<
        ApiResponse<Availability[]>
      >("/providers/me/availability", { memberId, availability })
      .then((r) => r.data),

  getServiceSlots: (serviceId: string, memberId?: string) =>
    api
      .get<ApiResponse<ServiceSlot[]>>(
        `/providers/me/service-slots/${serviceId}`,
        {
          params: memberId ? { memberId } : undefined,
        },
      )
      .then((r) => r.data),

  setServiceSlots: (
    serviceId: string,
    memberId: string,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  ) =>
    api
      .put<
        ApiResponse<ServiceSlot[]>
      >("/providers/me/service-slots", { serviceId, memberId, slots })
      .then((r) => r.data),

  updatePricingSettings: (data: {
    dynamicPricing?: boolean;
    weekendPremium?: boolean;
    weekendPremiumPercent?: number;
    autoAccept?: boolean;
  }) =>
    api
      .patch<ApiResponse<Provider>>("/providers/me/pricing", data)
      .then((r) => r.data),

  getStats: (memberId?: string) =>
    api
      .get<ApiResponse<ProviderStats>>("/providers/me/stats", {
        params: memberId ? { memberId } : undefined,
      })
      .then((r) => r.data),

  getClients: (page?: number, limit?: number, memberId?: string) =>
    api
      .get<
        ApiResponse<{ clients: ProviderClient[]; meta: PaginationMeta }>
      >("/providers/me/clients", { params: { page, limit, memberId } })
      .then((r) => r.data),
};

// ============================================================================
// BOOKINGS
// ============================================================================

export const bookingApi = {
  create: (data: CreateBookingInput) =>
    api.post<ApiResponse<Booking>>("/bookings", data).then((r) => r.data),

  getAvailableSlots: (params: {
    providerId: string;
    serviceId: string;
    date: string;
    memberId?: string;
  }) =>
    api
      .get<
        ApiResponse<{ slots: TimeSlot[]; date: string; serviceId: string }>
      >("/bookings/available-slots", { params })
      .then((r) => r.data),

  getCustomerBookings: (params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<ApiResponse<{ bookings: Booking[]; meta: PaginationMeta }>>(
        "/bookings/customer",
        {
          params,
        },
      )
      .then((r) => r.data),

  getProviderBookings: (params?: {
    status?: string;
    memberId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<ApiResponse<{ bookings: Booking[]; meta: PaginationMeta }>>(
        "/bookings/provider",
        {
          params,
        },
      )
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<ApiResponse<Booking>>(`/bookings/${id}`).then((r) => r.data),

  updateStatus: (id: string, data: { status: string; cancelReason?: string }) =>
    api
      .patch<ApiResponse<Booking>>(`/bookings/${id}/status`, data)
      .then((r) => r.data),
};

// ============================================================================
// REVIEWS
// ============================================================================

export const reviewApi = {
  getProviderReviews: (
    providerId: string,
    params?: { page?: number; limit?: number; minRating?: number },
  ) =>
    api
      .get<ApiResponse<{ reviews: Review[]; meta: PaginationMeta }>>(
        `/reviews/provider/${providerId}`,
        {
          params,
        },
      )
      .then((r) => r.data),

  create: (data: { bookingId: string; rating: number; comment?: string }) =>
    api.post<ApiResponse<Review>>("/reviews", data).then((r) => r.data),

  getMyReviews: (params?: { page?: number; limit?: number }) =>
    api
      .get<
        ApiResponse<{ reviews: Review[]; meta: PaginationMeta }>
      >("/reviews/me", { params })
      .then((r) => r.data),
};

// ============================================================================
// FAVORITES
// ============================================================================

export const favoriteApi = {
  getAll: () =>
    api.get<ApiResponse<Favorite[]>>("/favorites").then((r) => r.data),

  add: (providerId: string) =>
    api
      .post<ApiResponse<Favorite>>(`/favorites/${providerId}`)
      .then((r) => r.data),

  remove: (providerId: string) =>
    api.delete(`/favorites/${providerId}`).then((r) => r.data),

  check: (providerId: string) =>
    api
      .get<
        ApiResponse<{ isFavorite: boolean }>
      >(`/favorites/${providerId}/check`)
      .then((r) => r.data),
};

// ============================================================================
// CATEGORIES
// ============================================================================

export const categoryApi = {
  getAll: () =>
    api.get<ApiResponse<Category[]>>("/categories").then((r) => r.data),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Category>>(`/categories/${slug}`).then((r) => r.data),

  getServiceTypes: (categoryId?: string) =>
    api
      .get<ApiResponse<ServiceType[]>>("/categories/service-types", {
        params: categoryId ? { categoryId } : {},
      })
      .then((r) => r.data),
};

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export const memberApi = {
  list: () =>
    api
      .get<ApiResponse<ProviderMember[]>>("/providers/me/members")
      .then((r) => r.data),

  invite: (data: { email: string; displayName?: string }) =>
    api
      .post<ApiResponse<ProviderMember>>("/providers/me/members/invite", data)
      .then((r) => r.data),

  getPendingInvites: () =>
    api
      .get<
        ApiResponse<ProviderMember[]>
      >("/providers/me/members/invites/pending")
      .then((r) => r.data),

  update: (memberId: string, data: { displayName?: string }) =>
    api
      .patch<
        ApiResponse<ProviderMember>
      >(`/providers/me/members/${memberId}`, data)
      .then((r) => r.data),

  deactivate: (memberId: string) =>
    api
      .delete<ApiResponse<ProviderMember>>(`/providers/me/members/${memberId}`)
      .then((r) => r.data),

  getDetail: (memberId: string) =>
    api
      .get<
        ApiResponse<MemberDetail>
      >(`/providers/me/members/${memberId}/detail`)
      .then((r) => r.data),

  assignService: (memberId: string, serviceId: string) =>
    api
      .post<ApiResponse<any>>(`/providers/me/members/${memberId}/services`, {
        serviceId,
      })
      .then((r) => r.data),

  removeService: (memberId: string, serviceId: string) =>
    api
      .delete(`/providers/me/members/${memberId}/services/${serviceId}`)
      .then((r) => r.data),

  setAvailability: (
    memberId: string,
    availability: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isEnabled: boolean;
    }[],
  ) =>
    api
      .put<
        ApiResponse<Availability[]>
      >(`/providers/me/members/${memberId}/availability`, { availability })
      .then((r) => r.data),

  // Public: get invite info by token
  getInviteInfo: (token: string) =>
    api
      .get<
        ApiResponse<{
          email: string;
          displayName: string | null;
          provider: {
            id: string;
            businessName: string;
            logoUrl: string | null;
          };
        }>
      >(`/invites/${token}`)
      .then((r) => r.data),

  // Auth: register employee from invite
  registerFromInvite: (
    token: string,
    data: { password: string; firstName: string; lastName: string },
  ) =>
    api
      .post<any>(`/auth/register-from-invite/${token}`, data)
      .then((r) => r.data),
};
