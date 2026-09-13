import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Entity, Batch } from '../api';
import { AddEntityModal } from '../components/AddEntityModal';
import { AddBatchModal } from '../components/AddBatchModal';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { Building, GraduationCap, Plus, FolderPlus, Edit, Trash2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface OrganizationSetupProps {
  userRole: 'manager' | 'accountant';
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export const OrganizationSetup: React.FC<OrganizationSetupProps> = ({ userRole }) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedEntities, fetchedBatches, fetchedCategories] = await Promise.all([
        api.getEntities(),
        api.getBatches(),
        api.getExpenseCategories()
      ]);
      setEntities(fetchedEntities);
      setBatches(fetchedBatches);
      setExpenseCategories(fetchedCategories);
    } catch (error) {
      console.error("Failed to fetch organization data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this category? This might fail if expenses are already recorded under it.")) {
      try {
        await api.deleteExpenseCategory(id);
        toast.success("Category deleted successfully");
        fetchData();
      } catch (error: any) {
        toast.error(error.message || "Failed to delete category.");
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isManager = userRole === 'manager';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Setup</h1>
          <p className="text-muted-foreground mt-1">Manage entities and batches across Gurukul.</p>
        </div>
        {isManager && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setSelectedEntity(null); setIsEntityModalOpen(true); }} className="gap-2">
              <Building size={16} /> Add Entity
            </Button>
            <Button onClick={() => { setSelectedBatch(null); setIsBatchModalOpen(true); }} className="gap-2">
              <Plus size={16} /> Add Batch
            </Button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading organization structure...</div>
      ) : (
        <div className="space-y-6">
          {entities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderPlus className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground mb-4">No entities have been set up yet.</p>
                {isManager && (
                  <Button onClick={() => { setSelectedEntity(null); setIsEntityModalOpen(true); }}>
                    Create First Entity
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {entities.map(entity => (
                <motion.div key={entity.id} variants={itemVariants}>
                  <Card className="h-full flex flex-col">
                    <CardHeader className="border-b border-border bg-muted/20 pb-4">
                      <CardTitle className="flex items-center justify-between text-xl">
                        <div className="flex items-center gap-2">
                          <Building size={20} className="text-primary" />
                          {entity.name}
                        </div>
                        {entity.has_gst && (
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md tracking-wider">
                            GST ENABLED
                          </span>
                        )}
                      </CardTitle>
                      {entity.description && (
                        <CardDescription className="mt-1">{entity.description}</CardDescription>
                      )}
                      {isManager && (
                        <div className="mt-4 flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedEntity(entity); setIsEntityModalOpen(true); }} className="text-muted-foreground hover:text-primary">
                            <Edit size={14} className="mr-2" /> Edit
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="pt-8 border-t border-border mt-8">
            <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
              <GraduationCap size={24} className="text-primary" />
              Global Batches / Courses
            </h2>
            {batches.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No batches have been set up yet.</p>
                  {isManager && (
                    <Button onClick={() => { setSelectedBatch(null); setIsBatchModalOpen(true); }} variant="outline">
                      Create First Batch
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {batches.map(batch => (
                      <li key={batch.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-secondary rounded-md">
                            <GraduationCap size={16} className="text-secondary-foreground" />
                          </div>
                          <span className="font-medium">{batch.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            Created {new Date(batch.created_at).toLocaleDateString()}
                          </span>
                          {isManager && (
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedBatch(batch); setIsBatchModalOpen(true); }} className="text-muted-foreground hover:text-primary h-8 px-2">
                              <Edit size={14} />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="pt-8 border-t border-border mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Wallet size={24} className="text-primary" />
                Expense Categories
              </h2>
              {isManager && (
                <Button onClick={() => { setSelectedCategory(null); setIsCategoryModalOpen(true); }} variant="outline" className="gap-2">
                  <Plus size={16} /> Add Category
                </Button>
              )}
            </div>
            
            {expenseCategories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No expense categories have been set up yet.</p>
                  {isManager && (
                    <Button onClick={() => { setSelectedCategory(null); setIsCategoryModalOpen(true); }}>
                      Create First Category
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseCategories.map(category => (
                  <Card key={category.id} className="flex flex-col justify-between">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {category.description && (
                        <CardDescription>{category.description}</CardDescription>
                      )}
                    </CardHeader>
                    {isManager && (
                      <CardContent className="pt-0 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedCategory(category); setIsCategoryModalOpen(true); }} className="text-muted-foreground hover:text-primary">
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddEntityModal 
        isOpen={isEntityModalOpen} 
        onClose={() => setIsEntityModalOpen(false)} 
        onSuccess={fetchData} 
        initialData={selectedEntity}
      />
      <AddBatchModal 
        isOpen={isBatchModalOpen} 
        onClose={() => setIsBatchModalOpen(false)} 
        onSuccess={fetchData}
        initialData={selectedBatch}
      />
      <AddCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={fetchData}
        initialData={selectedCategory}
      />
    </div>
  );
};
