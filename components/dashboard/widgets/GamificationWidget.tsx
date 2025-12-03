"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Plus,
  History,
  Gift,
  ListChecks,
  Trash2,
  Repeat,
} from "lucide-react";
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
import { tr, enUS, de } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

// Günler Listesi
const WEEKDAYS = [
  { id: 1, label: "Pt" },
  { id: 2, label: "Sa" },
  { id: 3, label: "Ça" },
  { id: 4, label: "Pe" },
  { id: 5, label: "Cu" },
  { id: 6, label: "Ct" },
  { id: 0, label: "Pz" },
];

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
  const t = useTranslations("Gamification");
  const tCommon = useTranslations("Common");
  const tCal = useTranslations("Calendar"); // Takvimden çevirileri ödünç alalım
  const locale = useLocale();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "leaderboard" | "market" | "history" | "rules"
  >("leaderboard");

  const users = initialUsers;
  const rewards = initialRewards;
  const history = initialHistory;
  const rules = initialRules;

  const [isRewardOpen, setIsRewardOpen] = useState(false);
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [isGivePointsOpen, setIsGivePointsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [giveReason, setGiveReason] = useState("");
  const [giveAmount, setGiveAmount] = useState("");

  // Kural Ekleme Formu State'leri
  const [ruleFrequency, setRuleFrequency] = useState("none");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  const dateLocale = locale === "tr" ? tr : locale === "de" ? de : enUS;

  const handleGivePointsClick = (user: any) => {
    setSelectedUser(user);
    setGiveReason("");
    setGiveAmount("");
    setIsGivePointsOpen(true);
  };

  const handleRuleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ruleId = e.target.value;
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setGiveReason(rule.title);
      setGiveAmount(rule.points.toString());
    }
  };

  const toggleWeekDay = (dayId: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const tabItems = [
    { id: "leaderboard", icon: Trophy, label: t("tabLeaderboard") },
    { id: "rules", icon: ListChecks, label: t("tabRules") },
    { id: "market", icon: Gift, label: t("tabMarket") },
    { id: "history", icon: History, label: t("tabHistory") },
  ];

  return (
    <Card className="h-full flex flex-col bg-yellow-50/30 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex gap-2 text-yellow-700 dark:text-yellow-500">
          <Trophy className="h-4 w-4" />
          {t("title")}
        </CardTitle>

        <div className="flex gap-1 bg-white/50 p-1 rounded-lg dark:bg-gray-800/50 overflow-x-auto no-scrollbar">
          {tabItems.map((tab: any) => (
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
        {/* 1. LİDERLİK */}
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
                    <p className="text-sm font-semibold leading-none">
                      {user.full_name}
                    </p>
                    <p className="text-[10px] text-gray-500 capitalize">
                      {user.role === "owner" ? "Admin" : user.role}
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

        {/* 2. KURALLAR (GÜNCELLENDİ: Tekrar İkonu) */}
        {activeTab === "rules" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed h-8 text-xs"
              onClick={() => setIsRuleOpen(true)}
            >
              <Plus className="h-3 w-3 mr-2" /> {t("addRule")}
            </Button>

            <div className="space-y-2">
              {rules.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">--</p>
              ) : (
                rules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 bg-white border rounded-lg text-sm dark:bg-gray-900"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{rule.title}</span>
                      {/* Tekrar bilgisi varsa göster */}
                      {rule.frequency && rule.frequency !== "none" && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Repeat className="h-2.5 w-2.5" />
                          {tCal(`recurrence_${rule.frequency}`)}
                          {rule.recurrence_days &&
                            rule.recurrence_days.length > 0 &&
                            ` (${rule.recurrence_days.length} gün)`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        +{rule.points}
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm(tCommon("delete") + "?")) {
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

        {/* 3. MARKET */}
        {activeTab === "market" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed h-8 text-xs"
              onClick={() => setIsRewardOpen(true)}
            >
              <Plus className="h-3 w-3 mr-2" /> {t("addReward")}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {rewards.map(reward => (
                <div
                  key={reward.id}
                  className="border rounded-lg p-3 flex flex-col items-center text-center gap-1 hover:border-yellow-500 cursor-pointer bg-white dark:bg-gray-900 transition-all active:scale-95 hover:shadow-sm"
                  onClick={async () => {
                    if (!confirm("?")) return;
                    const res = await redeemReward(
                      reward.id,
                      reward.cost,
                      reward.title
                    );
                    if (res?.error) toast.error(tCommon("error"));
                    else {
                      toast.success(tCommon("success"));
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
            {history.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded"
              >
                <div>
                  <p className="text-xs font-medium">{item.description}</p>
                  <p className="text-[10px] text-gray-400">
                    {item.profiles?.full_name} •{" "}
                    {format(new Date(item.created_at), "d MMM HH:mm", {
                      locale: dateLocale,
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
            ))}
          </div>
        )}

        {/* MODALLAR */}
        <Dialog open={isGivePointsOpen} onOpenChange={setIsGivePointsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("givePoints")}: {selectedUser?.full_name}
              </DialogTitle>
            </DialogHeader>
            <form
              action={async fd => {
                const res = await givePoints(fd);
                if (res?.error) toast.error(tCommon("error"));
                else {
                  toast.success(tCommon("success"));
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
              <div className="space-y-1">
                <label className="text-xs text-gray-500">
                  {t("quickSelect")}
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  onChange={handleRuleSelect}
                  defaultValue=""
                >
                  <option value="" disabled>
                    ...
                  </option>
                  {rules.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} (+{r.points})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{tCommon("add")}</label>
                <Input
                  name="amount"
                  type="number"
                  placeholder="50"
                  required
                  value={giveAmount}
                  onChange={e => setGiveAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("reason")}</label>
                <Input
                  name="reason"
                  required
                  value={giveReason}
                  onChange={e => setGiveReason(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {tCommon("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* KURAL EKLEME MODALI (GÜNCELLENDİ) */}
        <Dialog open={isRuleOpen} onOpenChange={setIsRuleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addRule")}</DialogTitle>
            </DialogHeader>
            <form
              action={async fd => {
                if (ruleFrequency === "weekly" && selectedWeekDays.length > 0) {
                  fd.append("recurrence_days", selectedWeekDays.join(","));
                }
                const res = await createPointRule(fd);
                if (res?.error) toast.error(tCommon("error"));
                else {
                  toast.success(tCommon("success"));
                  setIsRuleOpen(false);
                  setRuleFrequency("none");
                  setSelectedWeekDays([]);
                  router.refresh();
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("ruleName")}</label>
                <Input name="title" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("points")}</label>
                  <Input name="points" type="number" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    {tCal("repeat")}
                  </label>
                  <select
                    name="frequency"
                    className="w-full border p-2 rounded text-sm bg-background"
                    value={ruleFrequency}
                    onChange={e => setRuleFrequency(e.target.value)}
                  >
                    <option value="none">{tCal("recurrence_none")}</option>
                    <option value="daily">{tCal("recurrence_daily")}</option>
                    <option value="weekly">{tCal("recurrence_weekly")}</option>
                    <option value="monthly">
                      {tCal("recurrence_monthly")}
                    </option>
                  </select>
                </div>
              </div>

              {/* GÜN SEÇİCİ (Haftalık ise) */}
              {ruleFrequency === "weekly" && (
                <div className="space-y-2 bg-gray-50 p-2 rounded border border-dashed dark:bg-gray-800 dark:border-gray-700">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {tCal("weekDays")}
                  </label>
                  <div className="flex justify-between">
                    {WEEKDAYS.map(day => (
                      <button
                        type="button"
                        key={day.id}
                        onClick={() => toggleWeekDay(day.id)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                          selectedWeekDays.includes(day.id)
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-white border text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full">
                {tCommon("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isRewardOpen} onOpenChange={setIsRewardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addReward")}</DialogTitle>
            </DialogHeader>
            <form
              action={async fd => {
                const res = await createReward(fd);
                if (res?.error) toast.error(tCommon("error"));
                else {
                  toast.success(tCommon("success"));
                  setIsRewardOpen(false);
                  router.refresh();
                }
              }}
              className="space-y-3"
            >
              <Input name="title" placeholder={t("rewardName")} required />
              <Input name="cost" type="number" placeholder="100" required />
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
                    className="border p-2 rounded text-center cursor-pointer hover:bg-gray-50 has-[:checked]:bg-yellow-100 has-[:checked]:border-yellow-500 dark:hover:bg-gray-800"
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
                {tCommon("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
