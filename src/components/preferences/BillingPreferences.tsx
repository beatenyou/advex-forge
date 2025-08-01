import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Crown, Zap, CheckCircle, ArrowUpCircle, Lock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface BillingPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: any;
  ai_quota_monthly: number;
  is_active: boolean;
}

interface UserBilling {
  plan_id: string;
  subscription_status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  ai_usage_current: number;
  ai_quota_limit: number;
  account_locked: boolean;
  account_lock_date: string | null;
  account_lock_reason: string | null;
}

export default function BillingPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [userBilling, setUserBilling] = useState<UserBilling | null>(null);
  const [currentPlan, setCurrentPlan] = useState<BillingPlan | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  const fetchBillingData = async () => {
    if (!user) return;

    try {
      // Fetch billing plans
      const { data: plansData, error: plansError } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch user billing info
      const { data: billingData, error: billingError } = await supabase
        .from('user_billing')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (billingError && billingError.code !== 'PGRST116') {
        console.error('Error fetching billing:', billingError);
        return;
      }

      if (billingData) {
        setUserBilling(billingData);
        // Find current plan
        const plan = plansData?.find(p => p.id === billingData.plan_id);
        setCurrentPlan(plan || null);
      } else {
        // Create default billing record for new users
        const freePlan = plansData?.find(p => p.name === 'Free');
        if (freePlan) {
          const { error } = await supabase
            .from('user_billing')
            .insert({
              user_id: user.id,
              plan_id: freePlan.id,
              ai_quota_limit: freePlan.ai_quota_monthly || 20,
            });

          if (!error) {
            setUserBilling({
              plan_id: freePlan.id,
              subscription_status: 'free',
              billing_cycle: 'monthly',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              ai_usage_current: 0,
              ai_quota_limit: freePlan.ai_quota_monthly,
              account_locked: false,
              account_lock_date: null,
              account_lock_reason: null,
            });
            setCurrentPlan(freePlan);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing information.',
        variant: 'destructive',
      });
    }
  };

  const upgradePlan = async (planId: string) => {
    setLoading(true);
    try {
      // This would typically integrate with Stripe or another payment processor
      toast({
        title: 'Upgrade Plan',
        description: 'Payment integration coming soon! Contact support for plan upgrades.',
      });
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to upgrade plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = () => {
    if (!userBilling) return 0;
    return (userBilling.ai_usage_current / userBilling.ai_quota_limit) * 100;
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return <CreditCard className="w-5 h-5" />;
      case 'pro':
        return <Zap className="w-5 h-5" />;
      case 'enterprise':
        return <Crown className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan & Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentPlan && getPlanIcon(currentPlan.name)}
            Current Plan: {currentPlan?.name || 'Loading...'}
          </CardTitle>
          <CardDescription>
            Your current subscription and usage details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userBilling && (
            <>
              {/* Account Lock Warning */}
              {userBilling.account_locked && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-semibold">Account Locked</span>
                  </div>
                  <p className="text-sm text-destructive/80">
                    {userBilling.account_lock_reason || 'Your account has been locked by an administrator.'}
                  </p>
                  {userBilling.account_lock_date && (
                    <p className="text-xs text-destructive/70 mt-1">
                      Lock date: {format(new Date(userBilling.account_lock_date), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Status</span>
                <div className="flex gap-2">
                  <Badge variant={userBilling.subscription_status === 'active' ? 'default' : 'secondary'}>
                    {userBilling.subscription_status.toUpperCase()}
                  </Badge>
                  {userBilling.account_locked && (
                    <Badge variant="destructive">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>AI Usage This Month</span>
                  <span>
                    {userBilling.ai_usage_current.toLocaleString()} / {userBilling.ai_quota_limit.toLocaleString()}
                  </span>
                </div>
                <Progress value={getUsagePercentage()} className="w-full" />
              </div>

              {userBilling.current_period_end && (
                <div className="flex items-center justify-between">
                  <span>Next Billing Date</span>
                  <span>{format(new Date(userBilling.current_period_end), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Purchase AI Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Purchase AI Credits
          </CardTitle>
          <CardDescription>
            Buy additional AI interactions to boost your quota
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { interactions: 100, price: 5, pricePerInteraction: 0.050 },
              { interactions: 250, price: 12, pricePerInteraction: 0.048, popular: true },
              { interactions: 500, price: 25, pricePerInteraction: 0.050 },
              { interactions: 1000, price: 48, pricePerInteraction: 0.048 },
              { interactions: 2500, price: 115, pricePerInteraction: 0.046, bestValue: true },
              { interactions: 5000, price: 225, pricePerInteraction: 0.045, bestValue: true }
            ].map((bundle) => (
              <Card key={bundle.interactions} className={`relative ${bundle.popular ? 'ring-2 ring-primary' : ''}`}>
                {bundle.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Popular
                    </Badge>
                  </div>
                )}
                {bundle.bestValue && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-600 text-white">
                      Best Value
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{bundle.interactions.toLocaleString()} Credits</CardTitle>
                  <div className="text-2xl font-bold text-primary">
                    ${bundle.price}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${bundle.pricePerInteraction.toFixed(3)} per interaction
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: 'Coming Soon',
                        description: 'AI credit purchasing will be available soon! Contact support for immediate credit additions.',
                      });
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase Credits
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>
            Monthly subscriptions with recurring AI interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${currentPlan?.id === plan.id ? 'ring-2 ring-primary' : ''}`}>
                {currentPlan?.id === plan.id && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Current Plan
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getPlanIcon(plan.name)}
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-2xl font-bold">
                    ${plan.price_monthly}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  {plan.price_yearly > 0 && (
                    <div className="text-sm text-muted-foreground">
                      ${plan.price_yearly}/year (save ${((plan.price_monthly * 12) - plan.price_yearly).toFixed(2)})
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>{plan.ai_quota_monthly.toLocaleString()}</strong> AI interactions/month
                    </div>
                    
                    <div className="space-y-2">
                      {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {currentPlan?.id !== plan.id && (
                      <Button
                        className="w-full mt-4"
                        onClick={() => upgradePlan(plan.id)}
                        disabled={loading}
                        variant={plan.name === 'Pro' ? 'default' : 'outline'}
                      >
                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                        {plan.price_monthly === 0 ? 'Downgrade to Free' : 'Upgrade Plan'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Your recent invoices and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No billing history available.</p>
            <p className="text-sm">Invoices will appear here after your first payment.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}