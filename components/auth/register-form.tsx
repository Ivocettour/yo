"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function RegisterForm({ firstUser, currentUserEmail }: { firstUser: boolean; currentUserEmail?: string | null }) {
  const [state, action, pending] = useActionState(register, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold">{firstUser ? "Crear tu cuenta" : "Crear cuenta"}</h2>
          <p className="mt-1 text-sm text-muted">
            {firstUser
              ? "Todavía no hay usuarios. Creá el usuario principal de la app."
              : "Completá tus datos para empezar."}
          </p>
        </div>
        {currentUserEmail ? (
          <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
            Tenés la sesión abierta como <strong>{currentUserEmail}</strong>. Si creás otra cuenta, vas a quedar conectado con la
            nueva.
          </p>
        ) : null}
        <form action={action} className="flex flex-col gap-4" noValidate>
          <FormError message={state && !state.ok ? state.error : null} />
          <Field label="Nombre" htmlFor="name" error={errors.name}>
            <Input id="name" name="name" autoComplete="name" required autoFocus aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={Boolean(errors.email)} />
          </Field>
          <Field label="Contraseña" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres.">
            <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(errors.password)} />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={pending}>
            Crear cuenta
          </Button>
        </form>
        <p className="text-center text-sm text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
