import React, { useState } from 'react';
import { UserPlus, Shield } from 'lucide-react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      await api.createAccountant(formData);
      toast.success('Accountant created successfully!');
      setFormData({ name: '', email: '', password: '' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create accountant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings & Users</h1>
        <p className="text-muted-foreground mt-1">Manage system settings and staff members</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-primary h-5 w-5" /> 
              Create Accountant
            </CardTitle>
            <CardDescription>Add a new accountant account to the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.g. Jane Doe"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@gurukul.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2 mt-2" 
                disabled={loading}
              >
                <UserPlus size={18} />
                {loading ? 'Creating...' : 'Create Accountant'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
