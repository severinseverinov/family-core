"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ShoppingBag, Star, Plus, Gift } from "lucide-react";
import { toast } from "sonner";
import {
  getLeaderboard,
  getRewards,
  createReward,
  redeemReward,
} from "@/app/actions/gamification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function GamificationWidget() {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "market">(
    "leaderboard"
  );
  const [users, setUsers] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Verileri Çek
  const loadData = async () => {
    const userRes = await getLeaderboard();
    const rewardRes = await getRewards();
    if (userRes.users) setUsers(userRes.users);
    if (rewardRes.rewards) setRewards(rewardRes.rewards);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ödül Satın Alma
  const handleRedeem = async (reward: any) => {
    if (
      !confirm(
        `"${reward.title}" ödülünü ${reward.cost} puana almak istiyor musun?`
      )
    )
      return;

    const res = await redeemReward(reward.id, reward.cost, reward.title);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Ödül alındı! 🎉");
      loadData(); // Puanları güncelle
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Aile Ligi
        </CardTitle>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              activeTab === "leaderboard"
                ? "bg-white shadow text-black dark:bg-gray-700 dark:text-white"
                : "text-gray-500"
            }`}
          >
            Sıralama
          </button>
          <button
            onClick={() => setActiveTab("market")}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              activeTab === "market"
                ? "bg-white shadow text-black dark:bg-gray-700 dark:text-white"
                : "text-gray-500"
            }`}
          >
            Market
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4">
        {/* LİDERLİK TABLOSU */}
        {activeTab === "leaderboard" && (
          <div className="space-y-3">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border dark:bg-gray-900/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white ${
                      index === 0
                        ? "bg-yellow-500"
                        : index === 1
                        ? "bg-gray-400"
                        : index === 2
                        ? "bg-orange-700"
                        : "bg-blue-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {user.full_name || "İsimsiz"}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role === "owner" ? "Baba/Anne" : user.role}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {user.current_points}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">Puan</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ÖDÜL MARKETİ */}
        {activeTab === "market" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Yeni Ödül Ekle
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {rewards.map(reward => (
                <div
                  key={reward.id}
                  className="border rounded-lg p-3 flex flex-col items-center text-center gap-2 hover:border-blue-500 cursor-pointer transition-colors"
                  onClick={() => handleRedeem(reward)}
                >
                  <div className="text-2xl">{reward.icon}</div>
                  <p className="text-xs font-medium line-clamp-1">
                    {reward.title}
                  </p>
                  <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    {reward.cost} P
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÖDÜL EKLEME MODALI */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Ödül Tanımla</DialogTitle>
            </DialogHeader>
            <form
              action={async fd => {
                await createReward(fd);
                setIsAddOpen(false);
                loadData();
                toast.success("Ödül eklendi");
              }}
              className="space-y-3"
            >
              <Input
                name="title"
                placeholder="Ödül Adı (Örn: 1 Saat Oyun)"
                required
              />
              <Input
                name="cost"
                type="number"
                placeholder="Puan Değeri (Örn: 100)"
                required
              />
              <div className="grid grid-cols-4 gap-2">
                {["🎮", "🍦", "🎟️", "🍔", "📱", "⚽", "🎁", "wd"].map(icon => (
                  <label
                    key={icon}
                    className="border p-2 rounded text-center cursor-pointer has-[:checked]:bg-blue-100"
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
