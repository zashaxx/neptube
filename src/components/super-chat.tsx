"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Crown,
  DollarSign,
  Loader2,
  MessageSquare,
  Heart,
} from "lucide-react";
import Image from "next/image";

interface SuperChatPanelProps {
  videoId: string;
  creatorId: string;
  creatorName: string;
}

const SUPER_CHAT_AMOUNTS = [
  { amount: 10000, label: "NPR 100", color: "#1E90FF" },
  { amount: 50000, label: "NPR 500", color: "#FF6B6B" },
  { amount: 100000, label: "NPR 1,000", color: "#FFD700" },
  { amount: 500000, label: "NPR 5,000", color: "#FF4500" },
  { amount: 1000000, label: "NPR 10,000", color: "#FF1493" },
];

type Gateway = "esewa" | "khalti" | "stripe" | "paypal";

/**
 * Super Chat panel for live streams. VIP members only.
 * Allows sending highlighted messages with payments to creators.
 */
export function SuperChatPanel({ videoId, creatorId, creatorName }: SuperChatPanelProps) {
  const { data: subscription } = trpc.premium.getMySubscription.useQuery();
  const { data: superChats } = trpc.premium.getSuperChats.useQuery({ videoId, limit: 50 });
  const sendSuperChat = trpc.premium.sendSuperChat.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(10000);
  const [message, setMessage] = useState("");
  const [gateway, setGateway] = useState<Gateway>("esewa");
  const [isSending, setIsSending] = useState(false);

  const isVip = subscription?.tier === "vip";

  const handleSendSuperChat = async () => {
    if (!isVip) return;
    setIsSending(true);
    try {
      // In production, first redirect to payment gateway and get transaction ID
      const mockTransactionId = `sc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await sendSuperChat.mutateAsync({
        receiverId: creatorId,
        videoId,
        amount: selectedAmount,
        message: message || undefined,
        gateway,
        gatewayTransactionId: mockTransactionId,
      });

      setMessage("");
      setDialogOpen(false);
      alert("Super Chat sent successfully!");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to send Super Chat");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Super Chat Messages Display */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {superChats?.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-2">
            No Super Chats yet. Be the first!
          </p>
        )}
        {superChats?.map((chat) => (
          <div
            key={chat.id}
            className="rounded-lg overflow-hidden"
            style={{ borderLeft: `3px solid ${chat.color}` }}
          >
            <div
              className="px-3 py-2 flex items-start gap-2"
              style={{ backgroundColor: `${chat.color}15` }}
            >
              <Image
                src={chat.sender.imageURL}
                alt={chat.sender.name}
                width={24}
                height={24}
                className="rounded-full flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white">{chat.sender.name}</span>
                  <Badge
                    className="text-[9px] px-1 py-0"
                    style={{ backgroundColor: chat.color || "#FFD700", color: "#000" }}
                  >
                    NPR {((chat.amount || 0) / 100).toLocaleString()}
                  </Badge>
                </div>
                {chat.message && (
                  <p className="text-xs text-gray-300 mt-0.5">{chat.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Send Super Chat Button */}
      {isVip ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold hover:from-yellow-400 hover:to-amber-400">
              <DollarSign className="h-4 w-4 mr-2" />
              Send Super Chat
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-800 border-neutral-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-yellow-500" />
                Super Chat to {creatorName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Amount Selection */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Amount</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SUPER_CHAT_AMOUNTS.map((opt) => (
                    <Button
                      key={opt.amount}
                      variant="outline"
                      size="sm"
                      className={`border-neutral-600 text-sm ${
                        selectedAmount === opt.amount
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                          : "text-gray-300 hover:bg-neutral-700"
                      }`}
                      onClick={() => setSelectedAmount(opt.amount)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">
                  Message (optional)
                </Label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something nice..."
                  maxLength={200}
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">{message.length}/200</p>
              </div>

              {/* Payment Gateway */}
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Payment Method</Label>
                <RadioGroup
                  value={gateway}
                  onValueChange={(v) => setGateway(v as Gateway)}
                  className="grid grid-cols-2 gap-2"
                >
                  {(["esewa", "khalti", "stripe", "paypal"] as const).map((gw) => (
                    <div
                      key={gw}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                        gateway === gw
                          ? "border-yellow-500 bg-yellow-500/5"
                          : "border-neutral-700 hover:border-neutral-600"
                      }`}
                    >
                      <RadioGroupItem value={gw} id={`sc-${gw}`} />
                      <Label htmlFor={`sc-${gw}`} className="text-sm text-white cursor-pointer capitalize">
                        {gw}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Preview */}
              <div
                className="rounded-lg p-3"
                style={{
                  borderLeft: `3px solid ${SUPER_CHAT_AMOUNTS.find((a) => a.amount === selectedAmount)?.color || "#FFD700"}`,
                  backgroundColor: `${SUPER_CHAT_AMOUNTS.find((a) => a.amount === selectedAmount)?.color || "#FFD700"}15`,
                }}
              >
                <p className="text-[10px] text-gray-500 mb-1">Preview</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white">You</span>
                  <Badge
                    className="text-[9px] px-1 py-0"
                    style={{
                      backgroundColor: SUPER_CHAT_AMOUNTS.find((a) => a.amount === selectedAmount)?.color || "#FFD700",
                      color: "#000",
                    }}
                  >
                    NPR {(selectedAmount / 100).toLocaleString()}
                  </Badge>
                </div>
                {message && <p className="text-xs text-gray-300 mt-1">{message}</p>}
              </div>

              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold"
                onClick={handleSendSuperChat}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Send NPR {(selectedAmount / 100).toLocaleString()}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <div className="text-center p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
          <Crown className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Super Chat is available for VIP members</p>
          <a
            href="/premium"
            className="text-xs text-yellow-400 hover:text-yellow-300 underline"
          >
            Upgrade to VIP
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Tip button component for creator pages. VIP only.
 */
interface TipButtonProps {
  creatorId: string;
  creatorName: string;
}

export function TipButton({ creatorId, creatorName }: TipButtonProps) {
  const { data: subscription } = trpc.premium.getMySubscription.useQuery();
  const sendTip = trpc.premium.sendTip.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [gateway, setGateway] = useState<Gateway>("esewa");
  const [isSending, setIsSending] = useState(false);

  const isVip = subscription?.tier === "vip";

  const handleSendTip = async () => {
    const amountInPaisa = Math.round(Number(amount) * 100);
    if (!amountInPaisa || amountInPaisa < 100) {
      alert("Minimum tip is NPR 1");
      return;
    }

    setIsSending(true);
    try {
      const mockTransactionId = `tip_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await sendTip.mutateAsync({
        receiverId: creatorId,
        amount: amountInPaisa,
        message: message || undefined,
        gateway,
        gatewayTransactionId: mockTransactionId,
      });

      setAmount("");
      setMessage("");
      setDialogOpen(false);
      alert("Tip sent! Thank you for supporting the creator.");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed to send tip");
    } finally {
      setIsSending(false);
    }
  };

  if (!isVip) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-pink-600 text-pink-400 hover:bg-pink-900/20"
        >
          <Heart className="h-4 w-4 mr-1" />
          Tip
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-800 border-neutral-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Tip {creatorName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-gray-300 text-sm mb-2 block">Amount (NPR)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              min="1"
              className="bg-neutral-900 border-neutral-700 text-white"
            />
            <div className="flex gap-2 mt-2">
              {[50, 100, 500, 1000].map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-neutral-600 text-xs text-gray-300 hover:bg-neutral-700"
                  onClick={() => setAmount(String(a))}
                >
                  {a}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-gray-300 text-sm mb-2 block">Message (optional)</Label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a message..."
              maxLength={500}
              className="bg-neutral-900 border-neutral-700 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300 text-sm mb-2 block">Payment Method</Label>
            <RadioGroup
              value={gateway}
              onValueChange={(v) => setGateway(v as Gateway)}
              className="grid grid-cols-2 gap-2"
            >
              {(["esewa", "khalti", "stripe", "paypal"] as const).map((gw) => (
                <div
                  key={gw}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                    gateway === gw
                      ? "border-pink-500 bg-pink-500/5"
                      : "border-neutral-700"
                  }`}
                >
                  <RadioGroupItem value={gw} id={`tip-${gw}`} />
                  <Label htmlFor={`tip-${gw}`} className="text-sm text-white cursor-pointer capitalize">
                    {gw}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button
            className="w-full bg-pink-600 hover:bg-pink-500 text-white"
            onClick={handleSendTip}
            disabled={isSending || !amount}
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Heart className="h-4 w-4 mr-2" />}
            Send Tip {amount ? `NPR ${Number(amount).toLocaleString()}` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
