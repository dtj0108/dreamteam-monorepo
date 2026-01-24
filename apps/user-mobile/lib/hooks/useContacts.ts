import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  ContactsQueryParams,
} from "../api/contacts";
import {
  Contact,
  ContactsResponse,
  CreateContactInput,
  UpdateContactInput,
} from "../types/sales";
import { leadKeys } from "./useLeads";

// Query keys
export const contactKeys = {
  all: ["contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (params?: ContactsQueryParams) => [...contactKeys.lists(), params] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
};

// Contacts queries
export function useContacts(params?: ContactsQueryParams) {
  return useQuery<ContactsResponse>({
    queryKey: contactKeys.list(params),
    queryFn: () => getContacts(params),
  });
}

export function useContact(id: string) {
  return useQuery<Contact>({
    queryKey: contactKeys.detail(id),
    queryFn: () => getContact(id),
    enabled: !!id,
  });
}

// Contact mutations
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactInput) => createContact(data),
    onSuccess: (_, { lead_id }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      // Also invalidate the lead detail to update contact count
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(lead_id) });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<UpdateContactInput, "id"> }) =>
      updateContact(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      // Invalidate all leads since we don't know which lead this contact belonged to
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}
