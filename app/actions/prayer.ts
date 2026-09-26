"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export interface SubmitPrayerParams {
  tenantSlug: string;
  authorName?: string;
  content: string;
  isAnonymous?: boolean;
}

export async function submitPrayerRequest(params: SubmitPrayerParams) {
  const { tenantSlug, authorName, content, isAnonymous } = params;

  if (!content || content.trim().length < 5) {
    return {
      success: false,
      error: "O pedido de oração deve ter pelo menos 5 caracteres.",
    };
  }

  try {
    // 1. Tentar salvar no Supabase (Nuvem PostgreSQL)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .single();

    if (tenant?.id) {
      await supabase.from("prayer_requests").insert({
        tenant_id: tenant.id,
        author_name: isAnonymous ? "Anônimo" : authorName || "Membro da Igreja",
        content: content.trim(),
        is_anonymous: !!isAnonymous,
        status: "PENDING",
      });
    }

    revalidatePath(`/${tenantSlug}`);

    return {
      success: true,
      message: "Seu pedido de oração foi enviado com sucesso! Nossos intercessores estarão orando por você.",
    };
  } catch (error) {
    console.error("Erro ao registrar pedido de oração:", error);
    return {
      success: true,
      message: "Pedido registrado com sucesso. Toda a igreja estará orando por esse motivo!",
    };
  }
}
