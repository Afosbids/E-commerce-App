import React, { useState } from 'react';
import { useAdminCategories, useCreateCategory } from '@/hooks/useAdminProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FolderTree, Plus } from 'lucide-react';

const CategoriesList: React.FC = () => {
  const { data: categories, isLoading } = useAdminCategories();
  const createCategory = useCreateCategory();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '' });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setNewCategory({ ...newCategory, name, slug: generateSlug(name) });
  };

  const handleCreate = async () => {
    if (!newCategory.name || !newCategory.slug) {
      toast({ title: 'Name and slug are required', variant: 'destructive' });
      return;
    }

    try {
      await createCategory.mutateAsync(newCategory);
      toast({ title: 'Category created' });
      setDialogOpen(false);
      setNewCategory({ name: '', slug: '', description: '' });
    } catch (error) {
      toast({ title: 'Failed to create category', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="h-96 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Categories</h1>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories ({categories?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {categories && categories.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.slug}</p>
                  {category.description && (
                    <p className="text-sm mt-2">{category.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No categories yet</p>
              <Button onClick={() => setDialogOpen(true)}>Add First Category</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={newCategory.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Electronics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={newCategory.slug}
                onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                placeholder="e.g. electronics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCategory.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesList;