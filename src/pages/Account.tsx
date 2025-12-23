import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useProfile,
  useUpdateProfile,
  useAddresses,
  useAddAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/hooks/useAccount';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { User, MapPin, Plus, Pencil, Trash2, Star, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const addressSchema = z.object({
  address_line1: z.string().min(5, 'Address is required').max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  postal_code: z.string().max(20).optional(),
});

interface AddressFormData {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
}

const Account: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const updateProfile = useUpdateProfile();
  const addAddress = useAddAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    const result = profileSchema.safeParse(profileForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setProfileErrors(errors);
      return;
    }

    await updateProfile.mutateAsync({
      full_name: profileForm.full_name,
      phone: profileForm.phone || undefined,
    });
    setIsEditingProfile(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const result = passwordSchema.safeParse(passwordForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
        setPasswordLoading(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) {
        toast.error(updateError.message || 'Failed to update password');
        setPasswordLoading(false);
        return;
      }

      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  const openAddressDialog = (address?: any) => {
    if (address) {
      setEditingAddress(address.id);
      setAddressForm({
        address_line1: address.address_line1,
        address_line2: address.address_line2 || '',
        city: address.city,
        state: address.state,
        postal_code: address.postal_code || '',
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
      });
    }
    setAddressErrors({});
    setAddressDialogOpen(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressErrors({});

    const result = addressSchema.safeParse(addressForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setAddressErrors(errors);
      return;
    }

    if (editingAddress) {
      await updateAddress.mutateAsync({
        id: editingAddress,
        ...addressForm,
      });
    } else {
      await addAddress.mutateAsync(addressForm);
    }
    setAddressDialogOpen(false);
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container-narrow py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="container-narrow py-8">
        <h1 className="font-heading text-3xl font-bold mb-8">My Account</h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Manage your personal details</CardDescription>
                  </div>
                </div>
                {!isEditingProfile && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email || ''} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={e => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className={profileErrors.full_name ? 'border-destructive' : ''}
                    />
                    {profileErrors.full_name && (
                      <p className="text-sm text-destructive mt-1">{profileErrors.full_name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+234 800 123 4567"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={updateProfile.isPending}>
                      {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile?.full_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile?.phone || '—'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </div>
                </div>
                {!isChangingPassword && (
                  <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isChangingPassword ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className={passwordErrors.currentPassword ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-sm text-destructive mt-1">{passwordErrors.currentPassword}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className={passwordErrors.newPassword ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={passwordErrors.confirmPassword ? 'border-destructive' : ''}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={passwordLoading}>
                      {passwordLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Update Password
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Password last updated: Unknown
                </p>
              )}
            </CardContent>
          </Card>

          {/* Addresses Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Saved Addresses</CardTitle>
                    <CardDescription>Manage your delivery addresses</CardDescription>
                  </div>
                </div>
                <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => openAddressDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="address_line1">Address Line 1 *</Label>
                        <Input
                          id="address_line1"
                          value={addressForm.address_line1}
                          onChange={e => setAddressForm(prev => ({ ...prev, address_line1: e.target.value }))}
                          placeholder="123 Main Street"
                          className={addressErrors.address_line1 ? 'border-destructive' : ''}
                        />
                        {addressErrors.address_line1 && (
                          <p className="text-sm text-destructive mt-1">{addressErrors.address_line1}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="address_line2">Address Line 2</Label>
                        <Input
                          id="address_line2"
                          value={addressForm.address_line2}
                          onChange={e => setAddressForm(prev => ({ ...prev, address_line2: e.target.value }))}
                          placeholder="Apartment, suite, etc."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={addressForm.city}
                            onChange={e => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Lagos"
                            className={addressErrors.city ? 'border-destructive' : ''}
                          />
                          {addressErrors.city && (
                            <p className="text-sm text-destructive mt-1">{addressErrors.city}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={addressForm.state}
                            onChange={e => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                            placeholder="Lagos"
                            className={addressErrors.state ? 'border-destructive' : ''}
                          />
                          {addressErrors.state && (
                            <p className="text-sm text-destructive mt-1">{addressErrors.state}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="postal_code">Postal Code</Label>
                        <Input
                          id="postal_code"
                          value={addressForm.postal_code}
                          onChange={e => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                          placeholder="100001"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="submit"
                          disabled={addAddress.isPending || updateAddress.isPending}
                        >
                          {(addAddress.isPending || updateAddress.isPending) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {editingAddress ? 'Update Address' : 'Add Address'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setAddressDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {addressesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : !addresses || addresses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No saved addresses yet</p>
                  <p className="text-sm">Add an address to speed up checkout</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(address => (
                    <div
                      key={address.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {address.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{address.address_line1}</p>
                        {address.address_line2 && (
                          <p className="text-sm text-muted-foreground">{address.address_line2}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                        <p className="text-sm text-muted-foreground">{address.country}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!address.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultAddress.mutate(address.id)}
                            disabled={setDefaultAddress.isPending}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAddressDialog(address)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Address</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this address? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAddress.mutate(address.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Account;
