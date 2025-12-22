import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Bell, User, LogOut } from 'lucide-react';
import { useLowStockItems } from '@/hooks/useInventory';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const AdminHeader: React.FC = () => {
  const { user, signOut } = useAuth();
  const { data: lowStockItems } = useLowStockItems();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">Admin Panel</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {lowStockItems && lowStockItems.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {lowStockItems.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {lowStockItems && lowStockItems.length > 0 ? (
              lowStockItems.slice(0, 5).map(item => (
                <DropdownMenuItem key={item.id} className="flex flex-col items-start">
                  <span className="font-medium text-sm">{item.product?.name}</span>
                  <span className="text-xs text-warning">Only {item.quantity} left in stock</span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No alerts</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;