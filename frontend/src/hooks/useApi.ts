import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  providerApi,
  bookingApi,
  reviewApi,
  favoriteApi,
  categoryApi,
  userApi,
  memberApi,
} from "../lib/api-services";
import type { CreateBookingInput } from "../lib/types";

// ============================================================================
// CATEGORIES
// ============================================================================

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getAll(),
    staleTime: 1000 * 60 * 30, // 30 min
  });
}

export function useServiceTypes(categoryId?: string) {
  return useQuery({
    queryKey: ["categories", "service-types", categoryId],
    queryFn: () => categoryApi.getServiceTypes(categoryId),
    staleTime: 1000 * 60 * 30,
  });
}

// ============================================================================
// PROVIDERS
// ============================================================================

export function useProviderSearch(params?: {
  categorySlug?: string;
  search?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["providers", "search", params],
    queryFn: () => providerApi.search(params),
  });
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: ["providers", id],
    queryFn: () => providerApi.getById(id!),
    enabled: !!id,
  });
}

export function useMyProvider() {
  return useQuery({
    queryKey: ["providers", "me"],
    queryFn: () => providerApi.getMyProfile(),
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (no provider profile yet)
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useProviderStats(enabled = true) {
  return useQuery({
    queryKey: ["providers", "me", "stats"],
    queryFn: () => providerApi.getStats(),
    enabled,
  });
}

export function useProviderClients(page = 1, limit = 20, enabled = true) {
  return useQuery({
    queryKey: ["providers", "me", "clients", page, limit],
    queryFn: () => providerApi.getClients(page, limit),
    enabled,
  });
}

export function useCreateProvider() {
  return useMutation({
    mutationFn: providerApi.create,
    // NOTE: no auto-invalidation here — the onboarding flow
    // manually invalidates ["providers","me"] when all steps are done,
    // otherwise ProviderApp would unmount the flow mid-onboarding.
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: providerApi.updateMyProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function useAddService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: providerApi.addService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: Parameters<typeof providerApi.updateService>[1];
    }) => providerApi.updateService(serviceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: providerApi.deleteService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      availability,
    }: {
      memberId: string;
      availability: Parameters<typeof providerApi.setAvailability>[1];
    }) => providerApi.setAvailability(memberId, availability),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
      qc.invalidateQueries({ queryKey: ["providers", "me", "members"] });
    },
  });
}

export function useServiceSlots(serviceId?: string, memberId?: string) {
  return useQuery({
    queryKey: ["service-slots", serviceId, memberId],
    queryFn: () => providerApi.getServiceSlots(serviceId!, memberId),
    enabled: !!serviceId && !!memberId,
  });
}

export function useSetServiceSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceId,
      memberId,
      slots,
    }: {
      serviceId: string;
      memberId: string;
      slots: { dayOfWeek: number; startTime: string; endTime: string }[];
    }) => providerApi.setServiceSlots(serviceId, memberId, slots),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-slots"] });
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function useUpdatePricingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: providerApi.updatePricingSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

// ============================================================================
// BOOKINGS
// ============================================================================

export function useCustomerBookings(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["bookings", "customer", params],
    queryFn: () => bookingApi.getCustomerBookings(params),
  });
}

export function useProviderBookings(
  params?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ["bookings", "provider", params],
    queryFn: () => bookingApi.getProviderBookings(params),
    enabled,
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: () => bookingApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingInput) => bookingApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["available-slots"] });
    },
  });
}

export function useAvailableSlots(
  params: {
    providerId: string;
    serviceId: string;
    date: string;
    memberId?: string;
  } | null,
) {
  return useQuery({
    queryKey: ["available-slots", params],
    queryFn: () => bookingApi.getAvailableSlots(params!),
    enabled:
      !!params && !!params.providerId && !!params.serviceId && !!params.date,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      cancelReason,
    }: {
      id: string;
      status: string;
      cancelReason?: string;
    }) => bookingApi.updateStatus(id, { status, cancelReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

// ============================================================================
// REVIEWS
// ============================================================================

export function useProviderReviews(
  providerId: string | undefined,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["reviews", "provider", providerId, params],
    queryFn: () => reviewApi.getProviderReviews(providerId!, params),
    enabled: !!providerId,
  });
}

export function useMyReviews(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["reviews", "me", params],
    queryFn: () => reviewApi.getMyReviews(params),
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["providers"] });
    },
  });
}

// ============================================================================
// FAVORITES
// ============================================================================

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoriteApi.getAll(),
  });
}

export function useFavoriteCheck(providerId: string | undefined) {
  return useQuery({
    queryKey: ["favorites", "check", providerId],
    queryFn: () => favoriteApi.check(providerId!),
    enabled: !!providerId,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: favoriteApi.add,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: favoriteApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return { add: addMutation, remove: removeMutation };
}

// ============================================================================
// USER PROFILE
// ============================================================================

export function useUserProfile() {
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: () => userApi.getProfile(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userApi.uploadAvatar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ["user", "addresses"],
    queryFn: () => userApi.getAddresses(),
  });
}

export function useAddAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userApi.addAddress,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "addresses"] });
    },
  });
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ["user", "notifications"],
    queryFn: () => userApi.getNotificationPrefs(),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userApi.updateNotificationPrefs,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "notifications"] });
    },
  });
}

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export function useTeamMembers() {
  return useQuery({
    queryKey: ["providers", "me", "members"],
    queryFn: () => memberApi.list(),
  });
}

export function useMemberDetail(memberId: string | null) {
  return useQuery({
    queryKey: ["providers", "me", "members", memberId, "detail"],
    queryFn: () => memberApi.getDetail(memberId!),
    enabled: !!memberId,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: memberApi.invite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me", "members"] });
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ["providers", "me", "members", "pending"],
    queryFn: () => memberApi.getPendingInvites(),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string;
      data: Parameters<typeof memberApi.update>[1];
    }) => memberApi.update(memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me", "members"] });
    },
  });
}

export function useDeactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: memberApi.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me", "members"] });
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function useAssignServiceToMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      serviceId,
    }: {
      memberId: string;
      serviceId: string;
    }) => memberApi.assignService(memberId, serviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me", "members"] });
    },
  });
}

export function useRemoveServiceFromMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      serviceId,
    }: {
      memberId: string;
      serviceId: string;
    }) => memberApi.removeService(memberId, serviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me", "members"] });
    },
  });
}

export function useSetMemberAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      availability,
    }: {
      memberId: string;
      availability: Parameters<typeof memberApi.setAvailability>[1];
    }) => memberApi.setAvailability(memberId, availability),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers", "me", "members"] });
      qc.invalidateQueries({ queryKey: ["providers", "me"] });
    },
  });
}

export function useInviteInfo(token: string | undefined) {
  return useQuery({
    queryKey: ["invites", token],
    queryFn: () => memberApi.getInviteInfo(token!),
    enabled: !!token,
  });
}
