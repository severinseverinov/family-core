"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Copy, Check, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  createInvitation,
  cancelInvitation,
  removeMember,
} from "@/app/[locale]/actions/family";

export function MembersWidget({
  initialMembers,
  initialInvites,
  currentUserRole,
  currentUserId,
}: any) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");

  const isAdmin = ["owner", "admin"].includes(currentUserRole);

  // Davet Oluştur
  const handleInvite = async () => {
    if (!email) return toast.error("Bir e-posta adresi giriniz");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("role", role);

    const res = await createInvitation(formData);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Davet bağlantısı oluşturuldu!");
      setInviteLink(res?.link || "");
      setEmail("");
    }
  };

  // Linki Kopyala
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link kopyalandı! Eşine/Çocuğuna gönderebilirsin.");
  };

  // Üye Çıkar
  const handleRemoveMember = async (id: string) => {
    if (!confirm("Bu kişiyi aileden çıkarmak istediğine emin misin?")) return;

    const res = await removeMember(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Üye aileden çıkarıldı.");
      setMembers(members.filter((m: any) => m.id !== id));
    }
  };

  // Davet İptal
  const handleCancelInvite = async (id: string) => {
    if (!confirm("Daveti iptal etmek istiyor musun?")) return;

    await cancelInvitation(id);
    setInvites(invites.filter((i: any) => i.id !== id));
    toast.success("Davet iptal edildi.");
  };

  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6 space-y-8">
        {/* 1. ÜYE LİSTESİ */}
        <div className="space-y-4">
          {members.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-xl bg-white dark:bg-gray-900 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                    {member.full_name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {member.full_name || "İsimsiz Kullanıcı"}
                    </p>
                    {member.id === currentUserId && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Sen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 capitalize">
                    {member.role === "owner"
                      ? "👑 Aile Reisi"
                      : member.role === "admin"
                      ? "🛡️ Ebeveyn (Yönetici)"
                      : "👶 Çocuk (Üye)"}
                  </p>
                </div>
              </div>

              {/* SİLME BUTONU (Sadece Adminler, Kendini ve Owner'ı silemez) */}
              {isAdmin &&
                member.role !== "owner" &&
                member.id !== currentUserId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveMember(member.id)}
                    title="Aileden Çıkar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
            </div>
          ))}
        </div>

        {/* 2. DAVET ALANI (Sadece Adminler Görebilir) */}
        {isAdmin && (
          <div className="pt-6 border-t dark:border-gray-800 space-y-5">
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <UserPlus className="h-5 w-5" />
              <h3 className="font-semibold text-sm">
                Yeni Aile Üyesi Davet Et
              </h3>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="E-posta adresi (Örn: esin@mail.com)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1"
              />
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background min-w-[140px]"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="member">Çocuk (Üye)</option>
                <option value="admin">Ebeveyn (Yönetici)</option>
              </select>
              <Button
                onClick={handleInvite}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                Link Oluştur
              </Button>
            </div>

            {/* OLUŞAN LİNK GÖSTERİMİ */}
            {inviteLink && (
              <div className="flex flex-col gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm animate-in fade-in slide-in-from-top-2">
                <div className="font-medium flex items-center gap-2">
                  <Check className="h-4 w-4" /> Davet Hazır!
                </div>
                <p className="text-xs text-green-700/80">
                  Bu linki kopyalayıp eşine veya çocuğuna gönder. Linke
                  tıkladıklarında aileye katılacaklar.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 truncate bg-white/50 p-2 rounded border border-green-200 font-mono text-xs">
                    {inviteLink}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-green-300 hover:bg-green-100 text-green-800"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-3 w-3 mr-2" /> Kopyala
                  </Button>
                </div>
              </div>
            )}

            {/* BEKLEYEN DAVETLER LİSTESİ */}
            {invites.length > 0 && (
              <div className="mt-6 pt-4 border-t border-dashed">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">
                  Bekleyen Davetler
                </h4>
                <div className="space-y-2">
                  {invites.map((invite: any) => (
                    <div
                      key={invite.id}
                      className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {invite.email}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Rol: {invite.role === "admin" ? "Ebeveyn" : "Çocuk"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                        title="İptal Et"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
