"use client";

import { createFamily } from "@/app/[locale]/actions/family";
import { useActionState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitFamilyButton } from "./SubmitFamilyButton";
import { AlertCircle } from "lucide-react";

const initialState = {
  error: "",
};

async function handleCreateFamilyAction(
  prevState: typeof initialState,
  formData: FormData
) {
  const result = await createFamily(formData);

  if (result?.error) {
    return {
      error: result.error,
    };
  }

  return initialState;
}

export function CreateFamilyForm() {
  const [state, formAction] = useActionState(
    handleCreateFamilyAction,
    initialState
  );

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
          <form action={formAction} className="space-y-6">
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
            {state.error ? (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            ) : null}
            <SubmitFamilyButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
