import { supabase } from '@/integrations/supabase/client';

type AlertType = 'role_change' | '2fa_enabled' | '2fa_disabled' | 'user_deleted' | 'bulk_action' | 'security_event';
type AlertSeverity = 'info' | 'warning' | 'critical';

interface SendAlertParams {
  alertType: AlertType;
  actorEmail: string;
  actorName?: string;
  targetEmail?: string;
  targetName?: string;
  details: string;
  severity?: AlertSeverity;
}

export const useAdminAlerts = () => {
  const sendAdminAlert = async (params: SendAlertParams): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-alert', {
        body: params
      });

      if (error) {
        console.error('Error sending admin alert:', error);
        return false;
      }

      console.log('Admin alert sent successfully:', data);
      return true;
    } catch (err) {
      console.error('Failed to send admin alert:', err);
      return false;
    }
  };

  // Helper functions for common alert types
  const alertRoleChange = async (
    actorEmail: string,
    targetEmail: string,
    oldRole: string,
    newRole: string,
    actorName?: string,
    targetName?: string
  ) => {
    return sendAdminAlert({
      alertType: 'role_change',
      actorEmail,
      actorName,
      targetEmail,
      targetName,
      details: `User role changed from "${oldRole}" to "${newRole}". This change affects the user's access permissions across the admin dashboard.`,
      severity: newRole === 'admin' ? 'warning' : 'info'
    });
  };

  const alert2FAEnabled = async (
    actorEmail: string,
    actorName?: string
  ) => {
    return sendAdminAlert({
      alertType: '2fa_enabled',
      actorEmail,
      actorName,
      details: 'Two-factor authentication has been enabled for this admin account. The account is now protected with an additional security layer.',
      severity: 'info'
    });
  };

  const alert2FADisabled = async (
    actorEmail: string,
    actorName?: string
  ) => {
    return sendAdminAlert({
      alertType: '2fa_disabled',
      actorEmail,
      actorName,
      details: 'Two-factor authentication has been DISABLED for this admin account. The account is now only protected by password authentication.',
      severity: 'warning'
    });
  };

  const alertUserDeleted = async (
    actorEmail: string,
    targetEmail: string,
    actorName?: string,
    targetName?: string
  ) => {
    return sendAdminAlert({
      alertType: 'user_deleted',
      actorEmail,
      actorName,
      targetEmail,
      targetName,
      details: 'A user account has been permanently deleted from the system. All associated data has been removed.',
      severity: 'critical'
    });
  };

  const alertBulkAction = async (
    actorEmail: string,
    actionDescription: string,
    affectedCount: number,
    actorName?: string
  ) => {
    return sendAdminAlert({
      alertType: 'bulk_action',
      actorEmail,
      actorName,
      details: `Bulk action performed: ${actionDescription}. Affected ${affectedCount} record(s).`,
      severity: affectedCount > 10 ? 'warning' : 'info'
    });
  };

  const alertSecurityEvent = async (
    actorEmail: string,
    eventDescription: string,
    severity: AlertSeverity = 'warning',
    actorName?: string
  ) => {
    return sendAdminAlert({
      alertType: 'security_event',
      actorEmail,
      actorName,
      details: eventDescription,
      severity
    });
  };

  return {
    sendAdminAlert,
    alertRoleChange,
    alert2FAEnabled,
    alert2FADisabled,
    alertUserDeleted,
    alertBulkAction,
    alertSecurityEvent
  };
};
