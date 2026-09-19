"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Argentina/Mendoza",
  "America/Montevideo",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/New_York",
  "Europe/Madrid",
  "UTC",
];

export function ProfileForm({ name, email, timezone }: { name: string; email: string; timezone: string }) {
  const [state, action, pending] = useActionState<ActionResult<undefined> | null, FormData>(updateProfile, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];
  return (
    <Card>
      <CardHeader title="Perfil" />
      <CardBody className="pt-3">
        <form action={action} className="flex flex-col gap-4" noValidate>
          <FormError message={state && !state.ok && !Object.keys(errors).length ? state.error : null} />
          {state?.ok ? <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">{state.message}</p> : null}
          <Field label="Email" htmlFor="p-email" hint="El email no se puede cambiar.">
            <Input id="p-email" value={email} readOnly disabled />
          </Field>
          <Field label="Nombre" htmlFor="p-name" error={errors.name} required>
            <Input id="p-name" name="name" defaultValue={name} maxLength={80} required />
          </Field>
          <Field label="Zona horaria" htmlFor="p-tz" error={errors.timezone} hint='Se usa para calcular "hoy", "esta semana" y "este mes".'>
            <Select id="p-tz" name="timezone" defaultValue={timezone}>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" loading={pending} className="self-start">
            Guardar cambios
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionResult<undefined> | null, FormData>(changePassword, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <Card>
      <CardHeader title="Contraseña" subtitle="Al cambiarla se cierran las sesiones en otros dispositivos." />
      <CardBody className="pt-3">
        <form action={action} className="flex flex-col gap-4" noValidate key={state?.ok ? "done" : "form"}>
          <FormError message={state && !state.ok && !Object.keys(errors).length ? state.error : null} />
          {state?.ok ? <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">{state.message}</p> : null}
          <Field label="Contraseña actual" htmlFor="cp-current" error={errors.currentPassword} required>
            <Input id="cp-current" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Nueva contraseña" htmlFor="cp-new" error={errors.newPassword} hint="Mínimo 8 caracteres." required>
            <Input id="cp-new" name="newPassword" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Repetir nueva contraseña" htmlFor="cp-confirm" error={errors.confirmPassword} required>
            <Input id="cp-confirm" name="confirmPassword" type="password" autoComplete="new-password" required />
          </Field>
          <Button type="submit" loading={pending} className="self-start">
            Cambiar contraseña
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
