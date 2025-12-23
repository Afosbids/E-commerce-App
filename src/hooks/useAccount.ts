import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
}

interface Address {
  id: string;
  customer_id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  is_default: boolean;
}

interface AddressInput {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country?: string;
  postal_code?: string;
  is_default?: boolean;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });
};

export const useUpdateProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { full_name?: string; phone?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
};

export const useCustomer = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching customer:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });
};

export const useAddresses = () => {
  const { data: customer } = useCustomer();

  return useQuery({
    queryKey: ['addresses', customer?.id],
    queryFn: async (): Promise<Address[]> => {
      if (!customer) return [];

      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', customer.id)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching addresses:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!customer,
  });
};

export const useAddAddress = () => {
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: AddressInput) => {
      if (!customer) throw new Error('Customer not found');

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          customer_id: customer.id,
          address_line1: address.address_line1,
          address_line2: address.address_line2 || null,
          city: address.city,
          state: address.state,
          country: address.country || 'Nigeria',
          postal_code: address.postal_code || null,
          is_default: address.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add address');
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AddressInput & { id: string }) => {
      const { data, error } = await supabase
        .from('addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update address');
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete address');
    },
  });
};

export const useSetDefaultAddress = () => {
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      if (!customer) throw new Error('Customer not found');

      // First, unset all defaults
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('customer_id', customer.id);

      // Then set the new default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set default address');
    },
  });
};
