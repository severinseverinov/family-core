"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Dog,
  Cat,
  Fish,
  Rabbit,
  PawPrint,
  ListPlus,
  Camera,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  getPets,
  addPet,
  updatePet,
  deletePet,
  addPetRoutine,
  type Pet,
} from "@/app/actions/pets"; // <-- update ve delete eklendi
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const PET_TYPES = [
  { value: "dog", icon: Dog },
  { value: "cat", icon: Cat },
  { value: "fish", icon: Fish },
  { value: "rabbit", icon: Rabbit },
  { value: "other", icon: PawPrint },
];

export function PetWidget() {
  const t = useTranslations("Pets");
  const tCommon = useTranslations("Common");

  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  // Modallar
  const [dialogOpen, setDialogOpen] = useState(false); // Ekleme Modalı
  const [editOpen, setEditOpen] = useState(false); // Düzenleme Modalı
  const [routineOpen, setRoutineOpen] = useState(false);

  const [selectedPetId, setSelectedPetId] = useState("");
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  const [gender, setGender] = useState("male");

  const fetchPets = async () => {
    const res = await getPets();
    if (res.pets) setPets(res.pets);
    setLoading(false);
  };

  useEffect(() => {
    fetchPets();
  }, []);

  // EKLEME
  const handleAddPet = async (fd: FormData) => {
    const res = await addPet(fd);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      setDialogOpen(false);
      fetchPets();
    }
  };

  // GÜNCELLEME
  const handleUpdatePet = async (fd: FormData) => {
    const res = await updatePet(fd);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      setEditOpen(false);
      fetchPets();
    }
  };

  // SİLME
  const handleDeletePet = async (id: string) => {
    if (!confirm(tCommon("delete") + "?")) return;
    const res = await deletePet(id);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      fetchPets();
    }
  };

  // RUTİN EKLEME
  const handleAddRoutine = async (fd: FormData) => {
    const res = await addPetRoutine(fd);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      setRoutineOpen(false);
      router.refresh();
    }
  };

  // Düzenle butonuna tıklayınca
  const openEditModal = (pet: Pet) => {
    setEditingPet(pet);
    setEditOpen(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{t("title")}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto space-y-3">
        {loading ? (
          <div className="text-xs text-center">{tCommon("loading")}</div>
        ) : pets.length === 0 ? (
          <div className="text-xs text-center text-gray-400">{t("noPets")}</div>
        ) : (
          pets.map(pet => (
            <div
              key={pet.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 group relative"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border">
                  {pet.image_url ? (
                    <AvatarImage src={pet.image_url} className="object-cover" />
                  ) : null}
                  <AvatarFallback
                    className="text-white"
                    style={{
                      backgroundColor:
                        pet.color ||
                        (pet.gender === "female" ? "#ec4899" : "#3b82f6"),
                    }}
                  >
                    {(() => {
                      const Icon =
                        PET_TYPES.find(t => t.value === pet.type)?.icon ||
                        PawPrint;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {pet.name}
                    <span className="text-[10px] text-gray-400">
                      {pet.gender === "female" ? "♀" : "♂"}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-500 capitalize">
                    {pet.type}
                  </p>
                </div>
              </div>

              {/* Buton Grubu (Hover'da görünür) */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded p-1 absolute right-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-blue-500"
                  onClick={() => openEditModal(pet)}
                  title={tCommon("edit")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-orange-500"
                  onClick={() => {
                    setSelectedPetId(pet.id);
                    setRoutineOpen(true);
                  }}
                  title={t("addRoutine")}
                >
                  <ListPlus className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500"
                  onClick={() => handleDeletePet(pet.id)}
                  title={tCommon("delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* 1. EKLEME MODALI */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addPet")}</DialogTitle>
          </DialogHeader>
          <form action={handleAddPet} className="space-y-4">
            <div className="flex gap-3">
              <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400">
                <Camera className="h-6 w-6 mb-1" />
                <span className="text-[9px]">Foto</span>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="hidden"
                />
              </label>
              <div className="flex-1 space-y-2">
                <Input name="name" placeholder={t("name")} required />
                <select
                  name="type"
                  className="w-full border p-2 rounded-md text-sm bg-background"
                >
                  <option value="cat">Kedi</option>
                  <option value="dog">Köpek</option>
                  <option value="bird">Kuş</option>
                  <option value="fish">Balık</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                name="gender"
                className="w-full border p-2 rounded-md text-sm bg-background"
                onChange={e => setGender(e.target.value)}
              >
                <option value="male">Erkek (♂)</option>
                <option value="female">Dişi (♀)</option>
              </select>
              <Input
                name="color"
                type="color"
                className="h-9 w-full p-1 cursor-pointer"
                defaultValue={gender === "female" ? "#ec4899" : "#3b82f6"}
              />
            </div>
            <Button type="submit" className="w-full">
              {tCommon("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. DÜZENLEME MODALI */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("edit")}</DialogTitle>
          </DialogHeader>
          {editingPet && (
            <form action={handleUpdatePet} className="space-y-4">
              <input type="hidden" name="petId" value={editingPet.id} />
              <div className="flex gap-3">
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 relative overflow-hidden">
                  {editingPet.image_url ? (
                    <img
                      src={editingPet.image_url}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                  ) : (
                    <Camera className="h-6 w-6 mb-1" />
                  )}
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="hidden"
                  />
                </label>
                <div className="flex-1 space-y-2">
                  <Input name="name" defaultValue={editingPet.name} required />
                  <select
                    name="type"
                    defaultValue={editingPet.type}
                    className="w-full border p-2 rounded-md text-sm bg-background"
                  >
                    <option value="cat">Kedi</option>
                    <option value="dog">Köpek</option>
                    <option value="bird">Kuş</option>
                    <option value="fish">Balık</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="gender"
                  defaultValue={editingPet.gender || "male"}
                  className="w-full border p-2 rounded-md text-sm bg-background"
                >
                  <option value="male">Erkek (♂)</option>
                  <option value="female">Dişi (♀)</option>
                </select>
                <Input
                  name="color"
                  type="color"
                  className="h-9 w-full p-1 cursor-pointer"
                  defaultValue={editingPet.color || "#3b82f6"}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {tCommon("update")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. RUTİN EKLEME MODALI */}
      <Dialog open={routineOpen} onOpenChange={setRoutineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addRoutine")}</DialogTitle>
          </DialogHeader>
          <form action={handleAddRoutine} className="space-y-4">
            <input type="hidden" name="petId" value={selectedPetId} />
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("taskName")}</label>
              <Input name="title" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("frequency")}</label>
                <select
                  name="frequency"
                  className="w-full border p-2 rounded text-sm bg-background"
                >
                  <option value="daily">Günlük</option>
                  <option value="weekly">Haftalık</option>
                  <option value="monthly">Aylık</option>
                  <option value="yearly">Yıllık</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("points")}</label>
                <Input name="points" type="number" defaultValue="10" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("startDate")}</label>
              <Input
                name="startDate"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>
            <Button type="submit" className="w-full">
              {tCommon("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
