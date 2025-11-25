"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Dog, Cat, Fish, Rabbit, PawPrint } from "lucide-react";
import { toast } from "sonner";

// Server Actions
import { getPets, addPet, type Pet } from "@/app/actions/pets";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTrigger SİLİNDİ
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select"; // Custom select yerine native select de kullanabiliriz

const PET_TYPES = [
  { value: "dog", label: "Köpek", icon: Dog },
  { value: "cat", label: "Kedi", icon: Cat },
  { value: "fish", label: "Balık", icon: Fish },
  { value: "rabbit", label: "Tavşan", icon: Rabbit },
  { value: "other", label: "Diğer", icon: PawPrint },
];

function getPetIcon(type: string) {
  const petType = PET_TYPES.find(p => p.value === type);
  return petType?.icon || PawPrint;
}

export function PetWidget() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false); // Dialog durumunu kontrol eden state
  const [submitting, setSubmitting] = useState(false);

  // Hayvanları veritabanından çek
  const fetchPets = async () => {
    setLoading(true);
    try {
      const result = await getPets();
      if (result.error) {
        console.error(result.error);
        toast.error("Evcil hayvanlar yüklenemedi");
        setPets([]);
      } else {
        setPets(result.pets || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu");
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  // Form gönderme işlemi
  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);

    try {
      const result = await addPet(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        setDialogOpen(false);
        toast.success("Yeni dostumuz eklendi! 🐾");
        await fetchPets(); // Listeyi yenile
        router.refresh(); // Sunucu tarafını yenile
      }
    } catch (err) {
      toast.error("Evcil hayvan eklenirken hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Evcil Hayvanlar</CardTitle>

        {/* TRIGGER YOK, MANUEL BUTON VAR */}
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Ekle</span>
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Yükleniyor...</div>
          </div>
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <PawPrint className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Henüz kimse yok
              </p>
              <p className="text-xs text-gray-500">
                İlk evcil hayvanınızı ekleyin.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pets.map(pet => {
              const IconComponent = getPetIcon(pet.type);
              return (
                <div
                  key={pet.id}
                  className="flex items-center space-x-4 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm text-white"
                    style={{ backgroundColor: pet.color || "#3b82f6" }}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {pet.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {PET_TYPES.find(t => t.value === pet.type)?.label ||
                        pet.type}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DIALOG BİLEŞENİ (State ile kontrol ediliyor) */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Evcil Hayvan Ekle</DialogTitle>
              <DialogDescription>
                Ailenizin yeni üyesini buraya ekleyin.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4 pt-4" action={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  İsim
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Örn: Pamuk"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium">
                  Tür
                </label>
                {/* Hata riskini azaltmak için standart HTML select */}
                <select
                  id="type"
                  name="type"
                  required
                  disabled={submitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled selected>
                    Seçiniz
                  </option>
                  {PET_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="color" className="text-sm font-medium">
                  Renk (Avatar)
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    className="h-10 w-20 p-1 cursor-pointer"
                    defaultValue="#3b82f6"
                    disabled={submitting}
                  />
                  <span className="text-xs text-muted-foreground">
                    Listede görünecek renk.
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Ekleniyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
