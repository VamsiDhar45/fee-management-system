import React, { useState } from 'react';
import { supabase } from '../supabase';
import { IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success('Logged in successfully!');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-70"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-70"></div>
      </div>

      <Card className="w-full max-w-md z-10 shadow-xl border-border/50 bg-background/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-6 text-center">
          <div className="mx-auto bg-primary text-primary-foreground p-3 rounded-full shadow-lg shadow-primary/30 w-fit">
            <IndianRupee size={32} />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Gurukul Finance</CardTitle>
            <CardDescription className="text-base">Sign in to your account</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gurukul.com"
                required
              />
            </div>
            
            <div className="space-y-2 text-left">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-2" 
              size="lg"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
