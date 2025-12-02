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
  QrCode,
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
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code"; // <-- YENİ EKLENDİ

const ICONS: Record<string, any> = {
  wifi: Wifi,
  password: Key,
  document: FileText,
  other: Lock,
};

export function VaultWidget() {
  const t = useTranslations("Vault");
  const tCommon = useTranslations("Common");

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modallar
  const [isOpen, setIsOpen] = useState(false); // Ekleme Modalı
  const [isQrOpen, setIsQrOpen] = useState(false); // QR Modalı

  // State
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [addType, setAddType] = useState<"text" | "file">("text");

  // QR Data
  const [qrData, setQrData] = useState("");
  const [qrTitle, setQrTitle] = useState("");

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
      toast.error(tCommon("error"));
    }
  };

  // QR Kodu Göster (YENİ FONKSİYON)
  const handleShowQr = async (item: any) => {
    const res = await revealSecret(item.id);

    if (!res.secret) {
      toast.error(tCommon("error"));
      return;
    }

    let valueToEncode = res.secret;

    // Eğer Wi-Fi ise, otomatik bağlanma formatına çevir
    // Format: WIFI:S:SSID;T:WPA;P:PASSWORD;;
    if (item.category === "wifi") {
      // Not: item.title'ın SSID (Ağ Adı) olduğunu varsayıyoruz
      valueToEncode = `WIFI:S:${item.title};T:WPA;P:${res.secret};;`;
    }

    setQrData(valueToEncode);
    setQrTitle(item.title);
    setIsQrOpen(true);
  };

  // Dosyayı Aç
  const handleOpenFile = async (path: string) => {
    const res = await getFileUrl(path);
    if (res.url) {
      window.open(res.url, "_blank");
    } else {
      toast.error(tCommon("error"));
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(tCommon("delete") + "?")) return;
    await deleteVaultItem(item.id, item.file_path);
    toast.success(tCommon("success"));
    loadItems();
  };

  return (
    <Card className="h-full flex flex-col border-red-100 bg-red-50/30 dark:bg-red-900/10 dark:border-red-900/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex gap-2 text-red-700 dark:text-red-400">
          <Lock className="h-4 w-4" />
          {t("title")}
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
          <div className="text-xs text-center text-gray-400">
            {tCommon("loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="text-xs text-center text-gray-400">{t("empty")}</div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const IconComp =
                item.type === "file"
                  ? item.mime_type?.includes("image")
                    ? ImageIcon
                    : File
                  : ICONS[item.category as keyof typeof ICONS] || ICONS.other;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.title}
                      </p>
                      {item.type === "file" ? (
                        <span
                          className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline"
                          onClick={() => handleOpenFile(item.file_path)}
                        >
                          {t("viewFile")}
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

                  <div className="flex items-center gap-1">
                    {/* QR Butonu (Sadece metinler için) */}
                    {item.type === "text" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-gray-500 hover:text-blue-600"
                        onClick={() => handleShowQr(item)}
                        title="QR"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Göz / Dosya Aç Butonu */}
                    {item.type === "text" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleReveal(item.id)}
                      >
                        {revealedId === item.id ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
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
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Sil Butonu */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* EKLEME MODALI */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addItem")}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg dark:bg-gray-800">
              <button
                onClick={() => setAddType("text")}
                className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
                  addType === "text"
                    ? "bg-white shadow dark:bg-gray-700"
                    : "text-gray-500"
                }`}
              >
                {t("typeText")}
              </button>
              <button
                onClick={() => setAddType("file")}
                className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
                  addType === "file"
                    ? "bg-white shadow dark:bg-gray-700"
                    : "text-gray-500"
                }`}
              >
                {t("typeFile")}
              </button>
            </div>
            <form
              action={async fd => {
                fd.append("type", addType);
                const res = await addVaultItem(fd);
                if (res?.error) toast.error(tCommon("error"));
                else {
                  toast.success(tCommon("success"));
                  setIsOpen(false);
                  loadItems();
                }
              }}
              className="space-y-4"
            >
              <Input name="title" placeholder={t("name")} required />
              {addType === "text" ? (
                <Input
                  name="value"
                  placeholder={t("value")}
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
                  <option value="other">{t("category")}</option>
                  <option value="document">Belge</option>
                  <option value="wifi">Wi-Fi</option>
                  <option value="password">Şifre</option>
                  <option value="finance">Finans</option>
                </select>
              </div>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {addType === "text" ? t("btnEncrypt") : t("btnUpload")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* QR MODALI (YENİ) */}
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                {t("qrTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <QRCode value={qrData} size={200} />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">{qrTitle}</p>
                <p className="text-xs text-gray-500">{t("qrHelp")}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
