"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Dog, Cat, Fish, Rabbit } from "lucide-react";
import { getPets, addPet, type Pet } from "@/app/actions/pets";
import { useRouter } from "next/navigation";

const PET_TYPES = [
  { value: "dog", label: "Dog", icon: Dog },
  { value: "cat", label: "Cat", icon: Cat },
  { value: "fish", label: "Fish", icon: Fish },
  { value: "rabbit", label: "Rabbit", icon: Rabbit },
];

function getPetIcon(type: string) {
  const petType = PET_TYPES.find(p => p.value === type);
  return petType?.icon || Dog;
}

export function PetWidget() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPets = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPets();
      if (result.error) {
        setError(result.error);
        setPets([]);
      } else {
        setPets(result.pets || []);
      }
    } catch (err) {
      setError("Failed to load pets");
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await addPet(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setDialogOpen(false);
        setError(null);
        // Reset form by clearing the dialog
        await fetchPets();
        router.refresh();
      }
    } catch (err) {
      setError("Failed to add pet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Pet Hub</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Pet</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Pet</DialogTitle>
              <DialogDescription>
                Add a new pet to your family workspace.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={async e => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await handleSubmit(formData);
              }}
            >
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Buddy"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="type"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Type
                </label>
                <Select id="type" name="type" required disabled={submitting}>
                  <option value="">Select a type</option>
                  {PET_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="color"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Color (optional)
                </label>
                <Input
                  id="color"
                  name="color"
                  placeholder="Brown, White, etc."
                  disabled={submitting}
                />
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Pet"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading pets...</div>
          </div>
        ) : error && pets.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-red-500">{error}</div>
          </div>
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
              <Dog className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No pets yet</p>
            <p className="text-xs text-gray-400">
              Add your first pet to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {pets.map(pet => {
              const IconComponent = getPetIcon(pet.type);
              return (
                <div
                  key={pet.id}
                  className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
                    <IconComponent className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {pet.name}
                    </p>
                    {pet.color && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {pet.color}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
