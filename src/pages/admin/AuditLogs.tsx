import { useState } from "react";
import { format } from "date-fns";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Shield, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const TABLE_OPTIONS = [
  { value: "all", label: "All Tables" },
  { value: "orders", label: "Orders" },
  { value: "product_reviews", label: "Reviews" },
  { value: "products", label: "Products" },
  { value: "categories", label: "Categories" },
  { value: "inventory", label: "Inventory" },
  { value: "shipping_zones", label: "Shipping Zones" },
  { value: "user_roles", label: "User Roles" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "INSERT", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

function getActionBadgeVariant(action: string) {
  switch (action) {
    case "INSERT":
      return "default";
    case "UPDATE":
      return "secondary";
    case "DELETE":
      return "destructive";
    default:
      return "outline";
  }
}

function formatTableName(tableName: string) {
  return tableName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getChangeSummary(
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  tableName: string
): string {
  if (action === "INSERT") {
    if (tableName === "products" && newValues?.name) {
      return `Created product: ${newValues.name}`;
    }
    if (tableName === "categories" && newValues?.name) {
      return `Created category: ${newValues.name}`;
    }
    return "Created new record";
  }

  if (action === "DELETE") {
    if (tableName === "products" && oldValues?.name) {
      return `Deleted product: ${oldValues.name}`;
    }
    if (tableName === "categories" && oldValues?.name) {
      return `Deleted category: ${oldValues.name}`;
    }
    return "Deleted record";
  }

  if (action === "UPDATE" && oldValues && newValues) {
    // Order status change
    if (tableName === "orders" && oldValues.status !== newValues.status) {
      return `Status: ${oldValues.status} → ${newValues.status}`;
    }
    // Review moderation
    if (tableName === "product_reviews" && oldValues.status !== newValues.status) {
      return `Review ${newValues.status}: ${(newValues.title as string)?.slice(0, 30)}...`;
    }
    // Product update
    if (tableName === "products") {
      const changes: string[] = [];
      if (oldValues.name !== newValues.name) changes.push("name");
      if (oldValues.price !== newValues.price) changes.push("price");
      if (oldValues.is_active !== newValues.is_active) changes.push("status");
      return changes.length > 0 
        ? `Updated: ${changes.join(", ")}` 
        : "Updated product";
    }
    // Inventory update
    if (tableName === "inventory" && oldValues.quantity !== newValues.quantity) {
      return `Quantity: ${oldValues.quantity} → ${newValues.quantity}`;
    }
    return "Updated record";
  }

  return "Action performed";
}

function JsonViewer({ data, title }: { data: Record<string, unknown> | null; title: string }) {
  if (!data) return <p className="text-muted-foreground">No data</p>;
  
  return (
    <div>
      <h4 className="font-medium mb-2">{title}</h4>
      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogs() {
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: logs, isLoading, error } = useAuditLogs({
    tableName: tableFilter === "all" ? undefined : tableFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading audit logs. You may not have permission to view this data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Security Audit Logs</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by table" />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.user_email || log.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTableName(log.table_name)}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {getChangeSummary(log.action, log.old_values, log.new_values, log.table_name)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Audit Log Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">ID:</span>{" "}
                                <span className="font-mono">{log.id}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Record ID:</span>{" "}
                                <span className="font-mono">{log.record_id || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Admin:</span>{" "}
                                {log.user_email}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Timestamp:</span>{" "}
                                {format(new Date(log.created_at), "PPpp")}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <JsonViewer data={log.old_values} title="Previous Values" />
                              <JsonViewer data={log.new_values} title="New Values" />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm">Admin actions will appear here when they occur</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
