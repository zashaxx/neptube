"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Crown, Sparkles, Star, Zap, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const TIER_ICONS: Record<string, React.ReactNode> = {
  free: <Star className="h-6 w-6" />,
  lite: <Zap className="h-6 w-6" />,
  premium: <Sparkles className="h-6 w-6" />,
  vip: <Crown className="h-6 w-6" />,
};

const TIER_COLORS: Record<string, string> = {
  free: "border-gray-600",
  lite: "border-blue-500 shadow-blue-500/20",
  premium: "border-purple-500 shadow-purple-500/20",
  vip: "border-yellow-500 shadow-yellow-500/30",
};

const TIER_BADGE_COLORS: Record<string, string> = {
  free: "bg-gray-700 text-gray-300",
  lite: "bg-blue-600 text-white",
  premium: "bg-purple-600 text-white",
  vip: "bg-yellow-600 text-black",
};

const TIER_BUTTON_COLORS: Record<string, string> = {
  free: "bg-gray-700 hover:bg-gray-600 text-white",
  lite: "bg-blue-600 hover:bg-blue-500 text-white",
  premium: "bg-purple-600 hover:bg-purple-500 text-white",
  vip: "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold",
};

type Gateway = "esewa" | "khalti" | "stripe" | "paypal";

export default function PremiumPlansPage() {
  const { data: plans, isLoading: plansLoading } = trpc.premium.getPlans.useQuery();
  const { data: mySubscription, isLoading: subLoading } = trpc.premium.getMySubscription.useQuery();
  const { data: currentUser } = trpc.users.me.useQuery(undefined, { staleTime: 60_000 });
  const subscribe = trpc.premium.subscribe.useMutation();
  const isAdmin = currentUser?.role === "admin";

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<Gateway>("esewa");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async () => {
    if (!selectedTier || selectedTier === "free") return;

    setIsProcessing(true);
    try {
      const result = await subscribe.mutateAsync({
        tier: selectedTier as "lite" | "premium" | "vip",
        gateway: selectedGateway,
      });

      // In production, redirect to the payment gateway
      // For now, simulate payment flow
      alert(
        `Payment initiated!\n\nTier: ${selectedTier}\nAmount: NPR ${result.amount / 100}\nGateway: ${result.gateway}\nPayment ID: ${result.paymentId}\n\nIn production, you would be redirected to ${result.gateway} to complete payment.`
      );

      setPaymentDialogOpen(false);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to initiate subscription");
    } finally {
      setIsProcessing(false);
    }
  };

  if (plansLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const currentTier = mySubscription?.tier || "free";

  return (
    <div className="min-h-screen bg-neutral-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            NepTube Premium
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Unlock the full NepTube experience. Choose the plan that fits your needs
            and enjoy ad-free streaming, exclusive content, and much more.
          </p>
          {currentTier !== "free" && (
            <Badge className="mt-4 px-4 py-1 text-sm bg-green-600 text-white">
              Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          )}
          {isAdmin && (
            <div className="mt-3">
              <Badge className="px-4 py-1.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold">
                <Crown className="h-3.5 w-3.5 mr-1.5 inline" />
                Admin — All Features Unlocked
              </Badge>
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((plan) => {
            const isCurrentPlan = currentTier === plan.tier;
            const isUpgrade =
              ["lite", "premium", "vip"].indexOf(plan.tier) >
              ["lite", "premium", "vip"].indexOf(currentTier);

            return (
              <Card
                key={plan.tier}
                className={`bg-neutral-800 border-2 ${TIER_COLORS[plan.tier]} ${
                  plan.tier === "premium" ? "shadow-xl scale-[1.02]" : "shadow-lg"
                } transition-all hover:scale-[1.03] relative`}
              >
                {plan.tier === "premium" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white px-3 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {plan.tier === "vip" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-yellow-600 text-black px-3 py-1">
                      Best Value
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-2">
                    <div className={`p-3 rounded-full ${TIER_BADGE_COLORS[plan.tier]}`}>
                      {TIER_ICONS[plan.tier]}
                    </div>
                  </div>
                  <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {plan.tier === "free" ? (
                      <span className="text-2xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">
                          NPR {plan.price}
                        </span>
                        <span className="text-sm">/month</span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </CardContent>

                <CardFooter className="pt-4">
                  {isAdmin ? (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold cursor-default"
                      disabled
                    >
                      <Crown className="h-4 w-4 mr-1.5" />
                      Admin Access
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button
                      className="w-full bg-green-700 text-white cursor-default"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : plan.tier === "free" ? (
                    <Button className="w-full bg-gray-700 text-white" disabled>
                      Default
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${TIER_BUTTON_COLORS[plan.tier]}`}
                      onClick={() => {
                        setSelectedTier(plan.tier);
                        setPaymentDialogOpen(true);
                      }}
                    >
                      {isUpgrade ? "Upgrade" : "Subscribe"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Free</th>
                  <th className="text-center py-3 px-4 text-blue-400 font-medium">Lite</th>
                  <th className="text-center py-3 px-4 text-purple-400 font-medium">Premium</th>
                  <th className="text-center py-3 px-4 text-yellow-400 font-medium">VIP</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { feature: "Ads", free: "Full ads", lite: "Reduced", premium: "None", vip: "None" },
                  { feature: "Max Quality", free: "480p", lite: "720p", premium: "1080p", vip: "4K" },
                  { feature: "Offline Downloads", free: "—", lite: "5/month", premium: "Unlimited", vip: "Unlimited + Encrypted" },
                  { feature: "Playlists", free: "Up to 3", lite: "Basic", premium: "Unlimited", vip: "Unlimited" },
                  { feature: "Exclusive Content", free: "—", lite: "—", premium: "✓", vip: "✓" },
                  { feature: "Early Access", free: "—", lite: "—", premium: "✓", vip: "✓" },
                  { feature: "Super Chat", free: "—", lite: "—", premium: "—", vip: "✓" },
                  { feature: "Creator Tipping", free: "—", lite: "—", premium: "—", vip: "✓" },
                  { feature: "Priority Support", free: "—", lite: "—", premium: "—", vip: "✓" },
                  { feature: "Analytics Dashboard", free: "—", lite: "—", premium: "—", vip: "✓" },
                  { feature: "Premium Badge", free: "—", lite: "—", premium: "✓", vip: "✓ (VIP)" },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-neutral-700/50 hover:bg-neutral-800/50">
                    <td className="py-3 px-4 text-gray-300">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{row.free}</td>
                    <td className="py-3 px-4 text-center text-blue-300">{row.lite}</td>
                    <td className="py-3 px-4 text-center text-purple-300">{row.premium}</td>
                    <td className="py-3 px-4 text-center text-yellow-300">{row.vip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-neutral-800 border-neutral-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscribe to {selectedTier && selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedTier && plans && (
                <>
                  NPR {plans.find((p) => p.tier === selectedTier)?.price}/month
                  <br />
                  Choose your preferred payment method:
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup
              value={selectedGateway}
              onValueChange={(val) => setSelectedGateway(val as Gateway)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-700 hover:border-green-500 transition-colors cursor-pointer">
                <RadioGroupItem value="esewa" id="esewa" />
                <Label htmlFor="esewa" className="flex-1 cursor-pointer">
                  <div className="font-medium text-white">eSewa</div>
                  <div className="text-xs text-gray-400">Nepal&apos;s digital wallet</div>
                </Label>
                <span className="text-green-500 font-bold text-sm">eSewa</span>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-700 hover:border-purple-500 transition-colors cursor-pointer">
                <RadioGroupItem value="khalti" id="khalti" />
                <Label htmlFor="khalti" className="flex-1 cursor-pointer">
                  <div className="font-medium text-white">Khalti</div>
                  <div className="text-xs text-gray-400">Digital wallet & payment</div>
                </Label>
                <span className="text-purple-500 font-bold text-sm">Khalti</span>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-700 hover:border-blue-500 transition-colors cursor-pointer">
                <RadioGroupItem value="stripe" id="stripe" />
                <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                  <div className="font-medium text-white">Stripe</div>
                  <div className="text-xs text-gray-400">Credit/Debit card</div>
                </Label>
                <span className="text-blue-500 font-bold text-sm">Stripe</span>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-700 hover:border-sky-500 transition-colors cursor-pointer">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                  <div className="font-medium text-white">PayPal</div>
                  <div className="text-xs text-gray-400">International payments</div>
                </Label>
                <span className="text-sky-500 font-bold text-sm">PayPal</span>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-neutral-700 text-gray-300 hover:bg-neutral-700"
              onClick={() => setPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 ${selectedTier ? TIER_BUTTON_COLORS[selectedTier] : ""}`}
              onClick={handleSubscribe}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Pay Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
