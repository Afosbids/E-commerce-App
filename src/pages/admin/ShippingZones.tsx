import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Truck, Plus, Pencil } from 'lucide-react';
import { shippingZoneSchema, parseRegions } from '@/lib/validations';

interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  rate: number;
  min_order_amount: number | null;
  estimated_days: string | null;
  is_active: boolean;
}

const ShippingZones: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: zones, isLoading } = useQuery({
    queryKey: ['admin-shipping-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .order('rate');

      if (error) throw error;
      return data as ShippingZone[];
    },
  });

  const createZone = useMutation({
    mutationFn: async (zone: Omit<ShippingZone, 'id'>) => {
      const { error } = await supabase.from('shipping_zones').insert([zone]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-zones'] });
      toast({ title: 'Shipping zone created' });
    },
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, ...zone }: ShippingZone) => {
      const { error } = await supabase.from('shipping_zones').update(zone).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-zones'] });
      toast({ title: 'Shipping zone updated' });
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    regions: '',
    rate: 0,
    min_order_amount: 0,
    estimated_days: '',
    is_active: true,
  });

  const openCreate = () => {
    setEditingZone(null);
    setFormData({ name: '', regions: '', rate: 0, min_order_amount: 0, estimated_days: '', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (zone: ShippingZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      regions: zone.regions.join(', '),
      rate: zone.rate,
      min_order_amount: zone.min_order_amount || 0,
      estimated_days: zone.estimated_days || '',
      is_active: zone.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const parsedRegions = parseRegions(formData.regions);
    
    const zoneData = {
      name: formData.name.trim(),
      regions: parsedRegions,
      rate: formData.rate,
      min_order_amount: formData.min_order_amount || null,
      estimated_days: formData.estimated_days?.trim() || null,
      is_active: formData.is_active,
    };

    // Validate with zod
    const validation = shippingZoneSchema.safeParse(zoneData);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ');
      toast({ title: 'Validation error', description: errors, variant: 'destructive' });
      return;
    }

    try {
      if (editingZone) {
        await updateZone.mutateAsync({ id: editingZone.id, ...zoneData });
      } else {
        await createZone.mutateAsync(zoneData);
      }
      setDialogOpen(false);
    } catch (error) {
      toast({ title: 'Failed to save shipping zone', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  if (isLoading) {
    return <div className="h-96 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Shipping Zones</h1>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Zone
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Shipping Zones ({zones?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {zones && zones.length > 0 ? (
            <div className="space-y-4">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{zone.name}</h3>
                      {!zone.is_active && <span className="text-xs text-muted-foreground">(Inactive)</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Regions: {zone.regions.join(', ')}
                    </p>
                    {zone.estimated_days && (
                      <p className="text-sm text-muted-foreground">Est. delivery: {zone.estimated_days}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(zone.rate)}</p>
                      {zone.min_order_amount && zone.min_order_amount > 0 && (
                        <p className="text-xs text-muted-foreground">Min order: {formatCurrency(zone.min_order_amount)}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(zone)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No shipping zones configured</p>
              <Button onClick={openCreate}>Add First Zone</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Shipping Zone' : 'New Shipping Zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Zone Name</Label>
              <Input
                id="zone-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Lagos Metro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-regions">Regions (comma separated)</Label>
              <Input
                id="zone-regions"
                value={formData.regions}
                onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
                placeholder="e.g. Lagos, Ogun, Oyo"
              />
              <p className="text-xs text-muted-foreground">Use * for all regions (catch-all)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone-rate">Shipping Rate (NGN)</Label>
                <Input
                  id="zone-rate"
                  type="number"
                  min="0"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-min">Min Order Amount</Label>
                <Input
                  id="zone-min"
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-days">Estimated Delivery</Label>
              <Input
                id="zone-days"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                placeholder="e.g. 2-3 business days"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="zone-active">Active</Label>
              <Switch
                id="zone-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createZone.isPending || updateZone.isPending}>
              {editingZone ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingZones;