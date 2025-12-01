"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Eye,
  EyeOff,
  Plus,
  Wifi,
  FileText,
  Key,
  Trash2,
  Image as ImageIcon,
  File,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getVaultItems,
  addVaultItem,
  revealSecret,
  deleteVaultItem,
  getFileUrl,
} from "@/app/actions/vault";

const ICONS = {
  wifi: <Wifi className="h-4 w-4" />,
  password: <Key className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  other: <Lock className="h-4 w-4" />,
};

export function VaultWidget() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // State
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [addType, setAddType] = useState<"text" | "file">("text");

  const loadItems = async () => {
    const res = await getVaultItems();
    if (res.items) setItems(res.items);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Metin Şifreyi Göster
  const handleReveal = async (id: string) => {
    if (revealedId === id) {
      setRevealedId(null);
      setSecretValue("");
      return;
    }
    const res = await revealSecret(id);
    if (res.secret) {
      setSecretValue(res.secret);
      setRevealedId(id);
    } else {
      toast.error("Hata");
    }
  };

  // Dosyayı Aç (Signed URL Alır)
  const handleOpenFile = async (path: string) => {
    const res = await getFileUrl(path);
    if (res.url) {
      window.open(res.url, "_blank");
    } else {
      toast.error("Dosya açılamadı");
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm("Silmek istediğine emin misin?")) return;
    await deleteVaultItem(item.id, item.file_path); // Varsa dosya yolunu da gönder
    toast.success("Silindi");
    loadItems();
  };

  return (
    <Card className="h-full flex flex-col border-red-100 bg-red-50/30 dark:bg-red-900/10 dark:border-red-900/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex gap-2 text-red-700 dark:text-red-400">
          <Lock className="h-4 w-4" />
          Aile Kasası
        </CardTitle>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-xs text-center text-gray-400">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-center text-gray-400">Kasa boş.</div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm dark:bg-gray-900"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800">
                    {/* İkon Seçimi */}
                    {item.type === "file" ? (
                      item.mime_type?.includes("image") ? (
                        <ImageIcon className="h-4 w-4 text-blue-500" />
                      ) : (
                        <File className="h-4 w-4 text-orange-500" />
                      )
                    ) : (
                      ICONS[item.category as keyof typeof ICONS] || ICONS.other
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>

                    {/* İçerik Gösterimi */}
                    {item.type === "file" ? (
                      <span
                        className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline"
                        onClick={() => handleOpenFile(item.file_path)}
                      >
                        Dosyayı Görüntüle ↗
                      </span>
                    ) : (
                      <p className="text-xs text-gray-500 font-mono truncate h-4">
                        {revealedId === item.id ? (
                          <span className="text-red-600 bg-red-50 px-1 rounded">
                            {secretValue}
                          </span>
                        ) : (
                          "••••••••••••"
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  {item.type === "text" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleReveal(item.id)}
                    >
                      {revealedId === item.id ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  {item.type === "file" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleOpenFile(item.file_path)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EKLEME MODALI */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kasa Öğesi Ekle</DialogTitle>
            </DialogHeader>

            {/* TÜR SEÇİMİ */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setAddType("text")}
                className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
                  addType === "text" ? "bg-white shadow" : "text-gray-500"
                }`}
              >
                Şifre / Not
              </button>
              <button
                onClick={() => setAddType("file")}
                className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
                  addType === "file" ? "bg-white shadow" : "text-gray-500"
                }`}
              >
                Belge / Resim
              </button>
            </div>

            <form
              action={async fd => {
                fd.append("type", addType); // Tipi ekle
                const res = await addVaultItem(fd);
                if (res?.error) toast.error(res.error);
                else {
                  toast.success("Eklendi 🔒");
                  setIsOpen(false);
                  loadItems();
                }
              }}
              className="space-y-4"
            >
              <Input
                name="title"
                placeholder="Başlık (Örn: Kimlik Fotokopisi)"
                required
              />

              {addType === "text" ? (
                <Input
                  name="value"
                  placeholder="Gizli Bilgi / Şifre"
                  required
                  type="password"
                />
              ) : (
                <Input
                  name="file"
                  type="file"
                  required
                  className="cursor-pointer"
                />
              )}

              <div className="flex gap-2">
                <select
                  name="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="other">Kategori Seç (Opsiyonel)</option>
                  <option value="document">Belge</option>
                  <option value="wifi">Wi-Fi</option>
                  <option value="password">Şifre</option>
                  <option value="finance">Finans</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {addType === "text" ? "Şifrele ve Kaydet" : "Yükle ve Sakla"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
