"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ next, canRegister }: { next?: string; canRegister: boolean }) {
  const [state, action, pending] = useActionState(login, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted">Ingresá para ver y registrar tus gastos.</p>
        </div>
        <form action={action} className="flex flex-col gap-4" noValidate>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <FormError message={state && !state.ok ? state.error : null} />
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus aria-invalid={Boolean(errors.email)} />
          </Field>
          <Field label="Contraseña" htmlFor="password" error={errors.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(errors.password)} />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={pending}>
            Ingresar
          </Button>
        </form>
        {canRegister ? (
          <p className="text-center text-sm text-muted">
            ¿Primera vez?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Crear cuenta
            </Link>
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
