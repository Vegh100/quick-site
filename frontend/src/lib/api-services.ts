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

  uploadServiceImage: (serviceId: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return api
      .post<
        ApiResponse<Service>
      >(`/providers/me/services/${serviceId}/image`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },

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

  respond: (reviewId: string, response: string) =>
    api
      .post<ApiResponse<Review>>(`/reviews/${reviewId}/respond`, { response })
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

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notificationApi = {
  getAll: (page = 1, limit = 20) =>
    api
      .get<
        ApiResponse<{
          notifications: Array<{
            id: string;
            type: string;
            title: string;
            body: string | null;
            link: string | null;
            isRead: boolean;
            createdAt: string;
          }>;
          unreadCount: number;
          meta: PaginationMeta;
        }>
      >("/notifications", { params: { page, limit } })
      .then((r) => r.data),

  getUnreadCount: () =>
    api
      .get<ApiResponse<{ unreadCount: number }>>("/notifications/unread-count")
      .then((r) => r.data),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () => api.patch("/notifications/read-all").then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`).then((r) => r.data),

  clearAll: () => api.delete("/notifications").then((r) => r.data),
};

// ============================================================================
// REFERRALS
// ============================================================================

export const referralApi = {
  getMyReferral: () =>
    api
      .get<
        ApiResponse<{
          referral: {
            id: string;
            code: string;
            status: string;
            createdAt: string;
          };
          stats: {
            totalSent: number;
            totalRedeemed: number;
            pendingCount: number;
            recentRedeemed: Array<{
              id: string;
              redeemedAt: string | null;
              receiver: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                avatarUrl: string | null;
              } | null;
            }>;
          };
          shareUrl: string;
        }>
      >("/referrals/me")
      .then((r) => r.data),

  redeem: (code: string) =>
    api
      .post<ApiResponse<any>>("/referrals/redeem", { code })
      .then((r) => r.data),
};

// ============================================================================
// MESSAGING
// ============================================================================

export interface ConversationListItem {
  id: string;
  otherUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}

export const messagingApi = {
  getConversations: () =>
    api
      .get<ApiResponse<ConversationListItem[]>>("/messages/conversations")
      .then((r) => r.data),

  startConversation: (userId: string) =>
    api
      .post<ApiResponse<any>>("/messages/conversations", { userId })
      .then((r) => r.data),

  getMessages: (conversationId: string, page = 1, limit = 50) =>
    api
      .get<
        ApiResponse<{
          messages: MessageItem[];
          meta: PaginationMeta;
        }>
      >(`/messages/conversations/${conversationId}/messages`, {
        params: { page, limit },
      })
      .then((r) => r.data),

  sendMessage: (conversationId: string, content: string) =>
    api
      .post<
        ApiResponse<MessageItem>
      >(`/messages/conversations/${conversationId}/messages`, { content })
      .then((r) => r.data),

  getUnreadCount: () =>
    api
      .get<ApiResponse<{ unreadCount: number }>>("/messages/unread-count")
      .then((r) => r.data),
};

// ============================================================================
// PORTFOLIO
// ============================================================================

export interface PortfolioImageItem {
  id: string;
  providerId: string;
  serviceId: string | null;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
  service: { id: string; name: string } | null;
}

export const portfolioApi = {
  getByProvider: (providerId: string, serviceId?: string) =>
    api
      .get<
        ApiResponse<PortfolioImageItem[]>
      >(`/portfolio/provider/${providerId}`, { params: serviceId ? { serviceId } : {} })
      .then((r) => r.data),

  add: (data: { imageUrl: string; caption?: string; serviceId?: string }) =>
    api
      .post<ApiResponse<PortfolioImageItem>>("/portfolio", data)
      .then((r) => r.data),

  update: (id: string, data: { caption?: string; sortOrder?: number }) =>
    api
      .patch<ApiResponse<PortfolioImageItem>>(`/portfolio/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/portfolio/${id}`).then((r) => r.data),

  uploadFile: (file: File, caption?: string, serviceId?: string) => {
    const formData = new FormData();
    formData.append("image", file);
    if (caption) formData.append("caption", caption);
    if (serviceId) formData.append("serviceId", serviceId);
    return api
      .post<ApiResponse<PortfolioImageItem>>("/portfolio/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};

// ============================================================================
// BOOKING TIMELINE
// ============================================================================

export interface BookingActivityItem {
  id: string;
  bookingId: string;
  action: string;
  performedBy: string | null;
  note: string | null;
  createdAt: string;
  performer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  } | null;
}

export const bookingTimelineApi = {
  get: (bookingId: string) =>
    api
      .get<
        ApiResponse<BookingActivityItem[]>
      >(`/bookings/${bookingId}/timeline`)
      .then((r) => r.data),
};

// ============================================================================
// EXPORT & REPORTING
// ============================================================================

export interface RevenueSummary {
  period: { from: string; to: string };
  totalRevenue: number;
  totalCompleted: number;
  averagePerBooking: number;
  byService: {
    serviceId: string;
    serviceName: string;
    revenue: number;
    count: number;
  }[];
  daily: {
    date: string;
    revenue: number;
    bookings: number;
  }[];
}

export const exportApi = {
  downloadBookingsCsv: (filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) =>
    api
      .get("/export/bookings/csv", {
        params: filters,
        responseType: "blob",
      })
      .then((r) => {
        const blob = new Blob([r.data as any], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `foglalasok_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }),

  getRevenueSummary: (dateFrom: string, dateTo: string) =>
    api
      .get<ApiResponse<RevenueSummary>>("/export/revenue-summary", {
        params: { dateFrom, dateTo },
      })
      .then((r) => r.data),
};

// ============================================================================
// BUSINESS HOURS (public)
// ============================================================================

export interface BusinessHourItem {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  startTime: string | null;
  endTime: string | null;
}

export const businessHoursApi = {
  get: (providerId: string) =>
    api
      .get<
        ApiResponse<BusinessHourItem[]>
      >(`/providers/${providerId}/business-hours`)
      .then((r) => r.data),
};
