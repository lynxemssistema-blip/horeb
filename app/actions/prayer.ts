"use server";

import { prisma } from "@/lib/prisma";
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
    const cleanContent = isAnonymous
      ? `[Anônimo] ${content.trim()}`
      : `${authorName ? `[${authorName}] ` : ""}${content.trim()}`;

    // 1. Salvar no Prisma (Local)
    const localTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (localTenant?.id) {
      await prisma.prayerRequest.create({
        data: {
          tenantId: localTenant.id,
          content: cleanContent,
          status: "ACTIVE",
        },
      });
    }

    // 2. Sincronizar com Supabase se disponível
    try {
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
    } catch (sbErr) {
      console.warn("Supabase prayer sync warning:", sbErr);
    }

    try {
      revalidatePath(`/${tenantSlug}`);
    } catch {}

    return {
      success: true,
      message: "Seu pedido de oração foi enviado com sucesso! Nossos intercessores estarão orando por você.",
    };
  } catch (error) {
    console.error("Erro ao registrar pedido de oração:", error);
    return {
      success: false,
      error: "Não foi possível registrar o pedido de oração. Tente novamente.",
    };
  }
}

