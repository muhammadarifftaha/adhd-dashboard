"use client";
import React, { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from "@components/ui/field";
import Image from "next/image";
import { toast } from "sonner";
import { useSession } from "@hooks/use-session";
import {
  uploadProfilePicture,
  updateProfile,
} from "@components/account/actions";
import { profileUpdateSchema } from "@lib/schema/profile";
import { Spinner } from "@components/ui/spinner";
import { ImagePlusIcon, Loader2Icon, UserIcon, XIcon } from "lucide-react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

// Reuse the server's editable-field rules and add the client-only pending
// upload. Username and email are intentionally excluded — changing them needs
// dedicated flows (uniqueness/normalization, email re-verification), not a
// generic profile save.
const profileFormSchema = profileUpdateSchema.extend({
  imageFile: z
    .instanceof(File)
    .refine(
      (file) => file.size <= MAX_IMAGE_BYTES,
      "Image must be 5 MB or smaller",
    )
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Use a PNG, JPEG, WebP, or GIF image",
    )
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileCard() {
  const { data, isPending, isRefetching, refetch } = useSession();
  const isLoading = isPending || isRefetching;

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Blob: URL for the preview only — created in the pick handler, not stored in
  // the form (the File is the form value; this is just a view of it).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    // `values` (not defaultValues) keeps the form in sync as the session loads
    // and re-syncs after a save-triggered refetch (which also clears imageFile,
    // since it isn't a key here).
    values: {
      name: data?.user?.name ?? "",
      displayUsername: data?.user?.displayUsername ?? "",
      userInitials: data?.user?.userInitials ?? "",
    },
  });
  const {
    control,
    handleSubmit,
    setValue,
    resetField,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  // Revoke-only cleanup; the preview URL is created in handlePickFile.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the value so re-selecting the *same* file still fires onChange.
    event.target.value = "";
    if (!file) return;
    setValue("imageFile", file, { shouldDirty: true, shouldValidate: true });
    setPreviewUrl(URL.createObjectURL(file)); // previous URL revoked by cleanup
    clearErrors("imageFile");
  }

  function handleDiscard() {
    resetField("imageFile"); // back to the default (undefined)
    setPreviewUrl(null); // revoked by cleanup
    clearErrors("imageFile");
  }

  const onSubmit = async (values: ProfileFormValues) => {
    // One toast that transitions loading -> success/error in place (same id).
    const toastId = toast.loading("Saving profile…");
    try {
      // 1) Upload a newly-picked picture first (it sets user.image server-side).
      if (values.imageFile) {
        const formData = new FormData();
        formData.append("file", values.imageFile);
        const upload = await uploadProfilePicture(formData);
        if (upload?.error) {
          toast.error(upload.error, { id: toastId });
          return;
        }
      }
      // 2) Persist the editable text fields.
      const result = await updateProfile({
        name: values.name,
        displayUsername: values.displayUsername,
        userInitials: values.userInitials,
      });
      if (result?.error) {
        toast.error(result.error, { id: toastId });
        return;
      }
      // 3) Refresh the session; `values` resyncs the form and drops the preview.
      await refetch();
      setPreviewUrl(null);
      toast.success("Profile saved", { id: toastId });
    } catch {
      toast.error("Something went wrong. Please try again.", { id: toastId });
    }
  };

  return (
    <Card className="col-span-2 row-span-2">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>
          Manage your name, avatar initials, and profile picture.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-6 pb-4">
          <div className="flex flex-col gap-2 justify-start items-center">
            <div className="w-36 h-36 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center relative">
              {isLoading ? (
                <Spinner className="w-12 h-12 text-neutral-500 mx-auto my-auto" />
              ) : previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Selected profile picture preview"
                  fill
                  sizes="144px"
                  // blob: URLs can't be routed through the image optimizer.
                  unoptimized
                  className="rounded-full object-cover"
                />
              ) : data?.user?.image ? (
                <Image
                  src={data.user.image}
                  alt="Profile picture"
                  fill
                  sizes="144px"
                  // Served from the session-gated /api/files route: the optimizer
                  // fetches server-side without the user's cookie and would 401,
                  // so the browser must load it directly.
                  unoptimized
                  className="rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-neutral-500 mx-auto my-auto" />
              )}

              {/* Hidden native input; accept="image/*" lets mobile offer the
                  camera ("take a photo") or the gallery. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePickFile}
              />

              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Change profile picture"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-4 right-4 rounded-full p-1 transform translate-x-1/2 translate-y-1/2"
              >
                <ImagePlusIcon className="w-4 h-4" />
              </Button>

              {previewUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Discard selected picture"
                  onClick={handleDiscard}
                  className="absolute top-4 right-4 rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
            {errors.imageFile && <FieldError errors={[errors.imageFile]} />}
          </div>

          <FieldSet>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    {...field}
                    type="text"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="displayUsername"
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Display Username</FieldLabel>
                  <Input
                    id={field.name}
                    {...field}
                    type="text"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    The cased name shown to others (optional).
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="userInitials"
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Avatar Initials</FieldLabel>
                  <Input
                    id={field.name}
                    {...field}
                    type="text"
                    maxLength={2}
                    className="uppercase"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Up to 2 letters shown when you have no picture (optional).
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldSet>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
