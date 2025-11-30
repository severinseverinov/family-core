"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; // Varsa, yoksa span kullan
import { Trash2, Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  createInvitation,
  cancelInvitation,
  removeMember,
} from "@/app/actions/family";

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

  const handleInvite = async () => {
    if (!email) return toast.error("E-posta giriniz");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("role", role);

    const res = await createInvitation(formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Davet oluşturuldu!");
      setInviteLink(res?.link || ""); // Linki göster
      setEmail("");
      // Sayfayı yenilemeye gerek yok, linki verdik.
      // Gerçek zamanlı güncelleme için router.refresh() de yapılabilir.
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link kopyalandı!");
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Bu kişiyi aileden çıkarmak istediğine emin misin?")) return;
    const res = await removeMember(id);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Üye çıkarıldı");
      setMembers(members.filter((m: any) => m.id !== id));
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!confirm("Daveti iptal et?")) return;
    await cancelInvitation(id);
    setInvites(invites.filter((i: any) => i.id !== id));
    toast.success("İptal edildi");
  };

  const isAdmin = ["owner", "admin"].includes(currentUserRole);

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* ÜYE LİSTESİ */}
        <div className="space-y-4">
          {members.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-900"
            >
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>
                    {member.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {member.full_name} {member.id === currentUserId && "(Sen)"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {member.role === "owner"
                      ? "Aile Reisi"
                      : member.role === "admin"
                      ? "Ebeveyn"
                      : "Çocuk"}
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
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
            </div>
          ))}
        </div>

        {/* DAVET ALANI (Sadece Adminler) */}
        {isAdmin && (
          <div className="pt-6 border-t space-y-4">
            <h3 className="font-semibold text-sm">Yeni Üye Davet Et</h3>

            <div className="flex gap-2">
              <Input
                placeholder="E-posta adresi"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <select
                className="border rounded-md px-3 text-sm bg-background"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="member">Çocuk (Üye)</option>
                <option value="admin">Ebeveyn (Yönetici)</option>
              </select>
              <Button
                onClick={handleInvite}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Link Oluştur
              </Button>
            </div>

            {/* OLUŞAN LİNK */}
            {inviteLink && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm animate-in fade-in">
                <div className="flex-1 truncate font-mono">{inviteLink}</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-green-300 hover:bg-green-100"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-3 w-3 mr-2" /> Kopyala
                </Button>
              </div>
            )}

            {/* BEKLEYEN DAVETLER */}
            {invites.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2">
                  BEKLEYEN DAVETLER
                </h4>
                <div className="space-y-2">
                  {invites.map((invite: any) => (
                    <div
                      key={invite.id}
                      className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded"
                    >
                      <span>
                        {invite.email}{" "}
                        <span className="text-xs text-gray-400">
                          ({invite.role})
                        </span>
                      </span>
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        İptal
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
