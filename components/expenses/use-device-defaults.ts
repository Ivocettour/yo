"use client";

import { useEffect, type RefObject } from "react";
import { localTimeHHmm, localTodayISO } from "@/lib/utils/dates";

/**
 * Al montar, reemplaza la fecha/hora por defecto (calculadas en el servidor) por las del
 * reloj del dispositivo: es lo mas fiable cuando registras un gasto en el momento.
 * No se ejecuta al editar ni cuando la fecha viene fijada por la URL.
 */
export function useDeviceDateTimeDefaults(
  dateRef: RefObject<HTMLInputElement | null>,
  timeRef: RefObject<HTMLInputElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    if (dateRef.current) dateRef.current.value = localTodayISO();
    if (timeRef.current) timeRef.current.value = localTimeHHmm();
  }, [enabled, dateRef, timeRef]);
}
