import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  rate: number;
  min_order_amount: number | null;
  estimated_days: string | null;
  is_active: boolean;
}

export const useShippingZones = () => {
  return useQuery({
    queryKey: ['shipping-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('is_active', true)
        .order('rate');

      if (error) throw error;
      return data as ShippingZone[];
    },
  });
};

export const getShippingRate = (zones: ShippingZone[], state: string): ShippingZone | null => {
  const normalizedState = state.toLowerCase().trim();
  return zones.find(zone => 
    zone.regions.some(region => region.toLowerCase() === normalizedState)
  ) || zones.find(zone => zone.regions.includes('*')) || null;
};