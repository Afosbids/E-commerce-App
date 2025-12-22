import React, { useState } from 'react';
import { useInventory, useUpdateInventory, useAdjustStock } from '@/hooks/useInventory';
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Minus } from 'lucide-react';
import { Label } from '@/components/ui/label';

const InventoryList: React.FC = () => {
  const { data: inventory, isLoading } = useInventory();
  const updateInventory = useUpdateInventory();
  const adjustStock = useAdjustStock();
  const { toast } = useToast();

  const [editingItem, setEditingItem] = useState<{ id: string; quantity: number; threshold: number } | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      await updateInventory.mutateAsync({
        id: editingItem.id,
        quantity: editingItem.quantity,
        low_stock_threshold: editingItem.threshold,
      });
      toast({ title: 'Inventory updated' });
      setEditingItem(null);
    } catch (error) {
      toast({ title: 'Failed to update inventory', variant: 'destructive' });
    }
  };

  const handleQuickAdjust = async (id: string, adjustment: number) => {
    try {
      await adjustStock.mutateAsync({ id, adjustment });
      toast({ title: `Stock ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}` });
    } catch (error) {
      toast({ title: 'Failed to adjust stock', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="h-96 bg-muted animate-pulse rounded-lg" />;
  }

  const lowStockItems = inventory?.filter(item => item.quantity <= item.low_stock_threshold) || [];
  const inStockItems = inventory?.filter(item => item.quantity > item.low_stock_threshold) || [];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Inventory Management</h1>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-warning flex items-center gap-2">
              <Package className="h-5 w-5" />
              Low Stock Alert ({lowStockItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded overflow-hidden">
                          {item.product?.images?.[0] ? (
                            <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium">{item.product?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell>{item.low_stock_threshold}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAdjust(item.id, 10)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add 10
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem({ 
                            id: item.id, 
                            quantity: item.quantity, 
                            threshold: item.low_stock_threshold 
                          })}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>All Inventory ({inventory?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {inventory && inventory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Low Stock Threshold</TableHead>
                  <TableHead className="text-right">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const isLow = item.quantity <= item.low_stock_threshold;
                  const isOut = item.quantity === 0;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded overflow-hidden">
                            {item.product?.images?.[0] ? (
                              <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            {!item.product?.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge className="bg-warning/10 text-warning border-warning/20">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success border-success/20">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.quantity}</TableCell>
                      <TableCell>{item.low_stock_threshold}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuickAdjust(item.id, -1)}
                            disabled={item.quantity === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQuickAdjust(item.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                            onClick={() => setEditingItem({ 
                              id: item.id, 
                              quantity: item.quantity, 
                              threshold: item.low_stock_threshold 
                            })}
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No inventory items. Add products first.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Stock Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={editingItem.quantity}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    quantity: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Low Stock Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={editingItem.threshold}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    threshold: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateInventory.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryList;