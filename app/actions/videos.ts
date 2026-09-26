"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { extractYouTubeId } from "@/lib/utils";

export async function getChurchVideos(churchSlug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: churchSlug },
      include: {
        videos: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada." };
    }

    return {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        primaryColor: tenant.primaryColor,
      },
      videos: tenant.videos.map((v) => {
        const videoId = extractYouTubeId(v.youtubeUrl);
        return {
          id: v.id,
          title: v.title,
          youtubeUrl: v.youtubeUrl,
          videoId,
          embedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null,
          thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
          description: v.description,
          preacher: v.preacher,
          date: v.date,
          category: v.category || "Culto",
          createdAt: v.createdAt,
        };
      }),
    };
  } catch (error: any) {
    console.error("Erro ao carregar vídeos da igreja:", error);
    return { success: false, error: error.message };
  }
}

export async function createChurchVideo(params: {
  tenantSlug: string;
  title: string;
  youtubeUrl: string;
  description?: string;
  preacher?: string;
  date?: string;
  category?: string;
}) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada." };
    }

    const videoId = extractYouTubeId(params.youtubeUrl);
    if (!videoId) {
      return {
        success: false,
        error: "URL do YouTube inválida. Insira um link válido do YouTube (ex: https://www.youtube.com/watch?v=... ou https://youtu.be/...)",
      };
    }

    const video = await prisma.churchVideo.create({
      data: {
        title: params.title.trim(),
        youtubeUrl: params.youtubeUrl.trim(),
        description: params.description?.trim() || null,
        preacher: params.preacher?.trim() || null,
        date: params.date?.trim() || null,
        category: params.category || "Culto",
        tenantId: tenant.id,
      },
    });

    revalidatePath(`/${tenant.slug}`);
    revalidatePath(`/${tenant.slug}/videos`);

    return { success: true, video };
  } catch (error: any) {
    console.error("Erro ao cadastrar vídeo:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteChurchVideo(id: string, churchSlug: string) {
  try {
    await prisma.churchVideo.delete({
      where: { id },
    });

    revalidatePath(`/${churchSlug}`);
    revalidatePath(`/${churchSlug}/videos`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
