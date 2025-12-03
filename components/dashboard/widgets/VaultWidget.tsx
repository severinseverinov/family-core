"use client";

import { useState, useEffect, useMemo } from "react";
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
  File as FileIcon,
  Download,
  QrCode,
  ExternalLink,
  ArrowUpDown,
  Users,
  Shield,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  getVaultItems,
  addVaultItem,
  revealSecret,
  deleteVaultItem,
  getFileUrl,
} from "@/app/actions/vault";
import { getFamilyMembers } from "@/app/actions/family"; // Üyeleri çekmek için
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  wifi: Wifi,
  password: Key,
  document: FileText,
  other: Lock,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function VaultWidget() {
  const t = useTranslations("Vault");
  const tCommon = useTranslations("Common");
  const { resolvedTheme } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); // Aile üyeleri
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isFileOpen, setIsFileOpen] = useState(false);

  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [addType, setAddType] = useState<"text" | "file">("text");

  // Yeni State'ler
  const [sortBy, setSortBy] = useState<"date" | "name" | "category">("date");
  const [visibility, setVisibility] = useState("parents");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  const [qrData, setQrData] = useState("");
  const [qrTitle, setQrTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const loadData = async () => {
    const [itemsRes, membersRes] = await Promise.all([
      getVaultItems(),
      getFamilyMembers(),
    ]);
    if (itemsRes.items) setItems(itemsRes.items);
    if (membersRes.members) setMembers(membersRes.members);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // SIRALAMA
  const sortedItems = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      // Date (Default)
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    return list;
  }, [items, sortBy]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (addType === "file") {
      const file = formData.get("file") as File;
      if (file && file.size > MAX_FILE_SIZE) {
        toast.error("Dosya çok büyük (Max 10MB)");
        return;
      }
    }

    formData.append("type", addType);
    if (assignedTo.length > 0)
      formData.append("assignedTo", assignedTo.join(","));

    const promise = addVaultItem(formData);

    toast.promise(promise, {
      loading: tCommon("loading"),
      success: res => {
        if (res?.error) throw new Error(res.error);
        setIsOpen(false);
        loadData();
        return tCommon("success");
      },
      error: err => err.message,
    });
  };

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

  const handleShowQr = async (item: any) => {
    const res = await revealSecret(item.id);
    if (!res.secret) {
      toast.error(tCommon("error"));
      return;
    }
    let valueToEncode = res.secret;
    if (item.category === "wifi")
      valueToEncode = `WIFI:S:${item.title};T:WPA;P:${res.secret};;`;
    setQrData(valueToEncode);
    setQrTitle(item.title);
    setIsQrOpen(true);
  };

  const handlePreviewFile = async (item: any) => {
    const res = await getFileUrl(item.file_path);
    if (res.url) {
      setPreviewUrl(res.url);
      setPreviewType(item.mime_type || "");
      setPreviewTitle(item.title);
      setIsFileOpen(true);
    } else {
      toast.error(tCommon("error"));
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(tCommon("delete") + "?")) return;
    await deleteVaultItem(item.id, item.file_path);
    toast.success(tCommon("success"));
    loadData();
  };

  const qrBgColor = resolvedTheme === "dark" ? "#111827" : "#ffffff";
  const qrFgColor = resolvedTheme === "dark" ? "#ffffff" : "#000000";

  return (
    <Card className="h-full flex flex-col border-red-100 bg-red-50/30 dark:bg-red-900/10 dark:border-red-900/30 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex gap-2 text-red-700 dark:text-red-400">
          <Lock className="h-4 w-4" />
          {t("title")}
        </CardTitle>

        <div className="flex gap-1">
          {/* Sıralama Menüsü */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-500 hover:text-red-600"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("date")}>
                {t("sortDate")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name")}>
                {t("sortName")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("category")}>
                {t("sortCategory")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-xs text-center text-gray-400">
            {tCommon("loading")}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-xs text-center text-gray-400">{t("empty")}</div>
        ) : (
          <div className="space-y-2">
            {sortedItems.map(item => {
              const IconComp =
                item.type === "file"
                  ? item.mime_type?.includes("image")
                    ? ImageIcon
                    : FileIcon
                  : ICONS[item.category as keyof typeof ICONS] || ICONS.other;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm dark:bg-gray-900 dark:border-gray-800 group hover:border-red-200 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                          {item.title}
                        </p>
                        {/* Görünürlük İkonu */}
                        {item.visibility === "family" && (
                          <Users className="h-3 w-3 text-green-500" />
                        )}
                        {item.visibility === "parents" && (
                          <Shield className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      {item.type === "file" ? (
                        <span
                          className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 px-1.5 py-0.5 rounded cursor-pointer hover:underline"
                          onClick={() => handlePreviewFile(item)}
                        >
                          {t("viewFile")}
                        </span>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate h-4">
                          {revealedId === item.id ? (
                            <span className="text-red-600 bg-red-50 dark:bg-red-900/20 px-1 rounded">
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
                    {item.type === "text" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-gray-500 hover:text-blue-600"
                        onClick={() => handleShowQr(item)}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {item.type === "text" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-gray-500 hover:text-gray-700"
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
                        className="h-7 w-7 text-gray-500 hover:text-blue-600"
                        onClick={() => handlePreviewFile(item)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <select
                  name="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="other">{t("category")}</option>
                  <option value="document">Belge</option>
                  <option value="wifi">Wi-Fi</option>
                  <option value="password">Şifre</option>
                  <option value="finance">Finans</option>
                </select>

                <select
                  name="visibility"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                >
                  <option value="parents">{t("visParents")}</option>
                  <option value="family">{t("visFamily")}</option>
                  <option value="member">{t("visMember")}</option>
                </select>
              </div>

              {/* KİŞİ SEÇİMİ (Sadece 'member' ise) */}
              {visibility === "member" && (
                <div className="space-y-1 animate-in fade-in">
                  <label className="text-xs text-gray-500">
                    {t("selectMember")}
                  </label>
                  <select
                    multiple
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-20"
                    onChange={e =>
                      setAssignedTo(
                        Array.from(
                          e.target.selectedOptions,
                          option => option.value
                        )
                      )
                    }
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400">
                    Birden fazla seçim için Ctrl/Cmd tuşuna basılı tutun.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {addType === "text" ? t("btnEncrypt") : t("btnUpload")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* QR MODALI (Aynı) */}
        <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                {t("qrTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border dark:bg-gray-900 dark:border-gray-800">
                <QRCode
                  value={qrData}
                  size={200}
                  bgColor={qrBgColor}
                  fgColor={qrFgColor}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("qrHelp")}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DOSYA ÖNİZLEME (Aynı) */}
        <Dialog open={isFileOpen} onOpenChange={setIsFileOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b dark:border-gray-800 flex flex-row items-center justify-between">
              <DialogTitle className="truncate pr-4">
                {previewTitle}
              </DialogTitle>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="mr-8"
              >
                <Button size="sm" variant="ghost" className="h-8 gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {tCommon("save") || "İndir"}
                </Button>
              </a>
            </DialogHeader>
            <div className="flex-1 bg-gray-100 dark:bg-black flex items-center justify-center overflow-auto p-4">
              {previewType.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-w-full max-h-full object-contain shadow-lg rounded-md"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded-md bg-white border-none"
                  title="PDF Preview"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
