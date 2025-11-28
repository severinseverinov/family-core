"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, History, Gift, ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createReward,
  redeemReward,
  givePoints,
  createPointRule,
  deletePointRule,
} from "@/app/actions/gamification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Props Tanımı
interface GamificationWidgetProps {
  initialUsers: any[];
  initialRewards: any[];
  initialHistory: any[];
  initialRules: any[];
}

export function GamificationWidget({
  initialUsers,
  initialRewards,
  initialHistory,
  initialRules,
}: GamificationWidgetProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "leaderboard" | "market" | "history" | "rules"
  >("leaderboard");

  // Veriler (Props'tan gelenleri kullanıyoruz)
  // Props değiştiğinde (router.refresh ile) UI otomatik güncellenir
  const users = initialUsers;
  const rewards = initialRewards;
  const history = initialHistory;
  const rules = initialRules;

  // Modallar
  const [isRewardOpen, setIsRewardOpen] = useState(false);
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [isGivePointsOpen, setIsGivePointsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form State
  const [giveReason, setGiveReason] = useState("");
  const [giveAmount, setGiveAmount] = useState("");

  // Puan Verme Butonu
  const handleGivePointsClick = (user: any) => {
    setSelectedUser(user);
    setGiveReason("");
    setGiveAmount("");
    setIsGivePointsOpen(true);
  };

  // Kural Seçimi
  const handleRuleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ruleId = e.target.value;
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setGiveReason(rule.title);
      setGiveAmount(rule.points.toString());
    }
  };

  return (
    <Card className="h-full flex flex-col bg-yellow-50/30 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex gap-2 text-yellow-700 dark:text-yellow-500">
          <Trophy className="h-4 w-4" />
          Puan & Ödül
        </CardTitle>

        {/* Sekmeler */}
        <div className="flex gap-1 bg-white/50 p-1 rounded-lg dark:bg-gray-800/50 overflow-x-auto no-scrollbar">
          {[
            { id: "leaderboard", icon: Trophy, label: "Lider" },
            { id: "rules", icon: ListChecks, label: "Cetvel" },
            { id: "market", icon: Gift, label: "Market" },
            { id: "history", icon: History, label: "Geçmiş" },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${
                activeTab === tab.id
                  ? "bg-white shadow text-black"
                  : "text-gray-400"
              }`}
              title={tab.label}
            >
              <tab.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4 scrollbar-thin">
        {/* 1. LİDERLİK TABLOSU */}
        {activeTab === "leaderboard" && (
          <div className="space-y-3">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm dark:bg-gray-900 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs text-white ${
                      index === 0
                        ? "bg-yellow-500 shadow-yellow-200"
                        : index === 1
                        ? "bg-gray-400"
                        : index === 2
                        ? "bg-orange-700"
                        : "bg-blue-500"
                    } shadow-sm`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">
                      {user.full_name}
                    </p>
                    <p className="text-[10px] text-gray-500 capitalize">
                      {user.role === "owner" ? "Ebeveyn" : user.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="block text-sm font-bold text-blue-600 dark:text-blue-400">
                    {user.current_points} P
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleGivePointsClick(user)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. PUAN CETVELİ (STANDARTLAR) */}
        {activeTab === "rules" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed h-8 text-xs"
              onClick={() => setIsRuleOpen(true)}
            >
              <Plus className="h-3 w-3 mr-2" /> Standart Ekle
            </Button>

            <div className="space-y-2">
              {rules.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">
                  Kural yok.
                </p>
              ) : (
                rules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 bg-white border rounded-lg text-sm dark:bg-gray-900"
                  >
                    <span>{rule.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        +{rule.points}
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm("Silinsin mi?")) {
                            await deletePointRule(rule.id);
                            router.refresh();
                          }
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. ÖDÜL MARKETİ */}
        {activeTab === "market" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed h-8 text-xs"
              onClick={() => setIsRewardOpen(true)}
            >
              <Plus className="h-3 w-3 mr-2" /> Ödül Ekle
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {rewards.map(reward => (
                <div
                  key={reward.id}
                  className="border rounded-lg p-3 flex flex-col items-center text-center gap-1 hover:border-yellow-500 cursor-pointer bg-white dark:bg-gray-900 transition-all active:scale-95 hover:shadow-sm"
                  onClick={async () => {
                    if (
                      !confirm(`${reward.title} ödülünü almak istiyor musun?`)
                    )
                      return;
                    const res = await redeemReward(
                      reward.id,
                      reward.cost,
                      reward.title
                    );
                    if (res?.error) toast.error(res.error);
                    else {
                      toast.success("Ödül alındı!");
                      router.refresh();
                    }
                  }}
                >
                  <div className="text-2xl mb-1">{reward.icon}</div>
                  <p className="text-xs font-medium truncate w-full">
                    {reward.title}
                  </p>
                  <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    {reward.cost} P
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. GEÇMİŞ */}
        {activeTab === "history" && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-4">
                Henüz hareket yok.
              </p>
            ) : (
              history.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded"
                >
                  <div>
                    <p className="text-xs font-medium">{item.description}</p>
                    <p className="text-[10px] text-gray-400">
                      {item.profiles?.full_name} •{" "}
                      {format(new Date(item.created_at), "d MMM HH:mm", {
                        locale: tr,
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      item.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.amount > 0 ? "+" : ""}
                    {item.amount}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- MODALLAR --- */}

        {/* Puan Verme Modalı */}
        <Dialog open={isGivePointsOpen} onOpenChange={setIsGivePointsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Puan Ver: {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <form
              action={async fd => {
                const res = await givePoints(fd);
                if (res?.error) toast.error(res.error);
                else {
                  toast.success("Puan gönderildi 🚀");
                  setIsGivePointsOpen(false);
                  router.refresh();
                }
              }}
              className="space-y-4"
            >
              <input
                type="hidden"
                name="targetUserId"
                value={selectedUser?.id || ""}
              />

              {/* Standartlardan Seçim */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500">
                  Standartlardan Seç
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  onChange={handleRuleSelect}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Seçiniz...
                  </option>
                  {rules.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} (+{r.points})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Miktar</label>
                <Input
                  name="amount"
                  type="number"
                  placeholder="Örn: 50"
                  required
                  value={giveAmount}
                  onChange={e => setGiveAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sebep</label>
                <Input
                  name="reason"
                  placeholder="Örn: Odayı topladı"
                  required
                  value={giveReason}
                  onChange={e => setGiveReason(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Onayla
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Kural Ekleme Modalı */}
        <Dialog open={isRuleOpen} onOpenChange={setIsRuleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Standart Ekle</DialogTitle>
            </DialogHeader>
            <form
              action={async fd => {
                const res = await createPointRule(fd);
                if (res?.error) toast.error(res.error);
                else {
                  toast.success("Kural eklendi");
                  setIsRuleOpen(false);
                  router.refresh();
                }
              }}
              className="space-y-3"
            >
              <Input
                name="title"
                placeholder="Kural Adı (Örn: Çöpü Atmak)"
                required
              />
              <Input
                name="points"
                type="number"
                placeholder="Puan (Örn: 20)"
                required
              />
              <Button type="submit" className="w-full">
                Kaydet
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Ödül Ekleme Modalı */}
        <Dialog open={isRewardOpen} onOpenChange={setIsRewardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Ödül Ekle</DialogTitle>
            </DialogHeader>
            <form
              action={async fd => {
                const res = await createReward(fd);
                if (res?.error) toast.error(res.error);
                else {
                  toast.success("Ödül eklendi");
                  setIsRewardOpen(false);
                  router.refresh();
                }
              }}
              className="space-y-3"
            >
              <Input name="title" placeholder="Ödül Adı" required />
              <Input
                name="cost"
                type="number"
                placeholder="Puan Değeri"
                required
              />
              <div className="grid grid-cols-5 gap-2">
                {[
                  "🎮",
                  "🍦",
                  "🎟️",
                  "🍔",
                  "📱",
                  "⚽",
                  "🎁",
                  "🚲",
                  "🍕",
                  "💻",
                ].map(icon => (
                  <label
                    key={icon}
                    className="border p-2 rounded text-center cursor-pointer hover:bg-gray-50 has-[:checked]:bg-yellow-100 has-[:checked]:border-yellow-500"
                  >
                    <input
                      type="radio"
                      name="icon"
                      value={icon}
                      className="hidden"
                      defaultChecked={icon === "🎁"}
                    />
                    {icon}
                  </label>
                ))}
              </div>
              <Button type="submit" className="w-full">
                Kaydet
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
