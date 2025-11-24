import { createFamily } from "@/app/actions/family";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitFamilyButton } from "./SubmitFamilyButton";

export function CreateFamilyForm() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-semibold">
            Welcome to FamilyCore!
          </CardTitle>
          <CardDescription className="text-base">
            To get started, create a new family workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createFamily} className="space-y-6">
            <div className="space-y-2 text-left">
              <label
                htmlFor="familyName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Family Name
              </label>
              <Input
                id="familyName"
                name="familyName"
                placeholder="The Yilmaz Family"
                required
              />
            </div>
            <SubmitFamilyButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


