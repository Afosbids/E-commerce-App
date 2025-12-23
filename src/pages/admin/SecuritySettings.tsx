import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import TwoFactorEnrollment from '@/components/auth/TwoFactorEnrollment';
import PasswordChange from '@/components/auth/PasswordChange';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Key } from 'lucide-react';

const SecuritySettings: React.FC = () => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security and authentication settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Password Change */}
        <PasswordChange />

        {/* Two-Factor Authentication */}
        <TwoFactorEnrollment />

        {/* Security Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Best Practices
            </CardTitle>
            <CardDescription>
              Keep your admin account secure by following these recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Use a strong, unique password</p>
                  <p className="text-sm text-muted-foreground">
                    Create a password that's at least 12 characters with a mix of letters, numbers, and symbols
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Enable two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of protection with an authenticator app
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Review audit logs regularly</p>
                  <p className="text-sm text-muted-foreground">
                    Check the audit logs to monitor account activity and detect suspicious behavior
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecuritySettings;
