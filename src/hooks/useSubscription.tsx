import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SubscriptionState {
  isLoading: boolean;
  isSubscribed: boolean;
  subscriptionEnd: string | null;
}

export function useSubscription() {
  const { user } = useAuthContext();
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    isSubscribed: false,
    subscriptionEnd: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ isLoading: false, isSubscribed: false, subscriptionEnd: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke("stripe-check-subscription");
      
      if (error) {
        console.error("Check subscription error:", error);
        setState({ isLoading: false, isSubscribed: false, subscriptionEnd: null });
        return;
      }

      setState({
        isLoading: false,
        isSubscribed: data?.subscribed ?? false,
        subscriptionEnd: data?.subscription_end ?? null,
      });
    } catch (err) {
      console.error("Check subscription exception:", err);
      setState({ isLoading: false, isSubscribed: false, subscriptionEnd: null });
    }
  }, [user]);

  const startCheckout = useCallback(async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour vous abonner.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-checkout");

      if (error) {
        toast.error("Impossible de créer la session de paiement.");
        console.error("Checkout error:", error);
        return;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      toast.error("Erreur lors de la création du paiement.");
      console.error("Checkout exception:", err);
    }
  }, [user]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    ...state,
    checkSubscription,
    startCheckout,
  };
}
