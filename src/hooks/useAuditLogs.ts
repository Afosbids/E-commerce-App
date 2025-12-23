import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
}

interface UseAuditLogsOptions {
  tableName?: string;
  action?: string;
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { tableName, action, limit = 100 } = options;

  return useQuery({
    queryKey: ["audit-logs", tableName, action, limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq("table_name", tableName);
      }

      if (action) {
        query = query.eq("action", action);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
      }

      // Fetch user emails for the logs
      const userIds = [...new Set(data?.map((log) => log.user_id) || [])];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds);

        const emailMap = new Map(
          profiles?.map((p) => [p.user_id, p.email]) || []
        );

        return (data || []).map((log) => ({
          ...log,
          user_email: emailMap.get(log.user_id) || "Unknown",
        })) as AuditLog[];
      }

      return (data || []) as AuditLog[];
    },
  });
}
