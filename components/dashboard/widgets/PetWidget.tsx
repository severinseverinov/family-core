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
import { Plus, Dog, Cat, Fish, Rabbit, PawPrint, ListPlus } from "lucide-react";
import { getPets, addPet, addPetRoutine, type Pet } from "@/app/actions/pets";
import { toast } from "sonner";
import { useTranslations } from "next-intl"; // <-- EKLENDİ

const PET_TYPES = [
  { value: "dog", icon: Dog },
  { value: "cat", icon: Cat },
  { value: "fish", icon: Fish },
  { value: "rabbit", icon: Rabbit },
  { value: "other", icon: PawPrint },
];

export function PetWidget() {
  const t = useTranslations("Pets"); // <-- 'Pets' grubunu kullan
  const tCommon = useTranslations("Common"); // <-- Ortak metinler

  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState("");

  const fetchPets = async () => {
    const res = await getPets();
    if (res.pets) setPets(res.pets);
    setLoading(false);
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const handleAddPet = async (fd: FormData) => {
    const res = await addPet(fd);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      setDialogOpen(false);
      fetchPets();
    }
  };

  const handleAddRoutine = async (fd: FormData) => {
    const res = await addPetRoutine(fd);
    if (res?.error) toast.error(tCommon("error"));
    else {
      toast.success(tCommon("success"));
      setRoutineOpen(false);
      router.refresh();
    }
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
        ) : (
          pets.map(pet => (
            <div
              key={pet.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: pet.color || "#3b82f6" }}
                >
                  {(() => {
                    const Icon =
                      PET_TYPES.find(t => t.value === pet.type)?.icon ||
                      PawPrint;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <p className="font-medium text-sm">{pet.name}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setSelectedPetId(pet.id);
                  setRoutineOpen(true);
                }}
                title={t("addRoutine")}
              >
                <ListPlus className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      {/* PET EKLEME */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addPet")}</DialogTitle>
          </DialogHeader>
          <form action={handleAddPet} className="space-y-3">
            <Input name="name" placeholder={t("name")} required />
            <select name="type" className="w-full border p-2 rounded text-sm">
              <option value="cat">Kedi</option>
              <option value="dog">Köpek</option>
              <option value="bird">Kuş</option>
            </select>
            <Input
              name="color"
              type="color"
              className="h-10 w-20"
              defaultValue="#3b82f6"
            />
            <Button type="submit" className="w-full">
              {tCommon("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* RUTİN EKLEME */}
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
