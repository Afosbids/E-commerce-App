import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'customer';

interface CustomerWithRole {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_guest: boolean;
  created_at: string;
  user_id: string | null;
  role?: AppRole;
}

const CustomersList: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { alertRoleChange } = useAdminAlerts();
  const queryClient = useQueryClient();
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers-with-roles'],
    queryFn: async () => {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Fetch user roles for registered users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to customers
      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      
      return customersData?.map(customer => ({
        ...customer,
        role: customer.user_id ? (rolesMap.get(customer.user_id) as AppRole || 'customer') : undefined
      })) as CustomerWithRole[];
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, customerId, newRole, oldRole, customerEmail, customerName }: {
      userId: string;
      customerId: string;
      newRole: AppRole;
      oldRole: AppRole;
      customerEmail: string;
      customerName: string | null;
    }) => {
      // Update the role in user_roles table
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Send alert notification
      await alertRoleChange(
        user?.email || 'Unknown Admin',
        customerEmail,
        oldRole,
        newRole,
        user?.user_metadata?.full_name,
        customerName || undefined
      );

      return { newRole, oldRole };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers-with-roles'] });
      toast({
        title: 'Role Updated',
        description: `User role changed from ${data.oldRole} to ${data.newRole}. Admin notification sent.`,
      });
      setChangingRoleFor(null);
    },
    onError: (error) => {
      console.error('Error changing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
      setChangingRoleFor(null);
    },
  });

  const handleRoleChange = (customer: CustomerWithRole, newRole: AppRole) => {
    if (!customer.user_id || customer.role === newRole) return;
    
    setChangingRoleFor(customer.id);
    changeRoleMutation.mutate({
      userId: customer.user_id,
      customerId: customer.id,
      newRole,
      oldRole: customer.role || 'customer',
      customerEmail: customer.email,
      customerName: customer.full_name,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="h-96 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Customers</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {customers && customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.full_name || '—'}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || '—'}</TableCell>
                    <TableCell>
                      {customer.is_guest ? (
                        <Badge variant="secondary">Guest</Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success border-success/20">Registered</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.user_id ? (
                        <div className="flex items-center gap-2">
                          {changingRoleFor === customer.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Select
                              value={customer.role || 'customer'}
                              onValueChange={(value) => handleRoleChange(customer, value as AppRole)}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="admin">
                                  <span className="flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Admin
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(customer.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No customers yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersList;