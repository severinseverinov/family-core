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
import {
  Plus,
  Dog,
  Cat,
  Fish,
  Rabbit,
  PawPrint,
  ListPlus,
  Calendar,
} from "lucide-react";
import {
  getPets,
  addPet,
  addPetRoutine,
  type Pet,
} from "@/app/[locale]/actions/pets";
import { toast } from "sonner";

const PET_TYPES = [
  { value: "dog", icon: Dog },
  { value: "cat", icon: Cat },
  { value: "fish", icon: Fish },
  { value: "rabbit", icon: Rabbit },
  { value: "other", icon: PawPrint },
];

export function PetWidget() {
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
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Eklendi");
      setDialogOpen(false);
      fetchPets();
    }
  };

  const handleAddRoutine = async (fd: FormData) => {
    const res = await addPetRoutine(fd);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Rutin plana eklendi 📅");
      setRoutineOpen(false);
      router.refresh();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Evcil Hayvanlar</CardTitle>
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
          <div className="text-xs text-center">Yükleniyor...</div>
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
                title="Görev Ekle"
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
            <DialogTitle>Yeni Dost Ekle</DialogTitle>
          </DialogHeader>
          <form action={handleAddPet} className="space-y-3">
            <Input name="name" placeholder="İsim" required />
            <select name="type" className="w-full border p-2 rounded text-sm">
              <option value="cat">Kedi</option>
              <option value="dog">Köpek</option>
              <option value="bird">Kuş</option>
              <option value="other">Diğer</option>
            </select>
            <Input
              name="color"
              type="color"
              className="h-10 w-20"
              defaultValue="#3b82f6"
            />
            <Button type="submit" className="w-full">
              Kaydet
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* RUTİN EKLEME */}
      <Dialog open={routineOpen} onOpenChange={setRoutineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Görev Tanımla</DialogTitle>
          </DialogHeader>
          <form action={handleAddRoutine} className="space-y-4">
            <input type="hidden" name="petId" value={selectedPetId} />

            <div className="space-y-1">
              <label className="text-xs font-medium">Görev Adı</label>
              <Input name="title" placeholder="Örn: Aşı Randevusu" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Sıklık</label>
                <select
                  name="frequency"
                  className="w-full border p-2 rounded text-sm bg-background"
                >
                  <option value="daily">Her Gün</option>
                  <option value="weekly">Haftalık</option>
                  <option value="monthly">Aylık</option>
                  <option value="yearly">Yıllık</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Puan Değeri</label>
                <Input
                  name="points"
                  type="number"
                  placeholder="10"
                  required
                  defaultValue="10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Başlangıç Tarihi</label>
              <Input
                name="startDate"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              <p className="text-[10px] text-gray-500">
                Haftalık/Aylık tekrarlar bu tarihe göre ayarlanır.
              </p>
            </div>

            <Button type="submit" className="w-full">
              Görevi Kaydet
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
