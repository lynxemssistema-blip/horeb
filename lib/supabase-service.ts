import { supabase } from "@/lib/supabase";

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  parent_id: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  branches?: { id: string; name: string; slug: string; primary_color: string }[];
}

export async function getTenantBySlug(slug: string): Promise<TenantData | null> {
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !tenant) return null;

  // Se tiver parent_id, buscar matriz
  let parent = null;
  if (tenant.parent_id) {
    const { data: parentData } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenant.parent_id)
      .single();
    parent = parentData;
  }

  // Se for matriz, buscar filiais
  let branches: { id: string; name: string; slug: string; primary_color: string }[] = [];
  if (!tenant.parent_id) {
    const { data: branchesData } = await supabase
      .from("tenants")
      .select("id, name, slug, primary_color")
      .eq("parent_id", tenant.id);
    branches = branchesData || [];
  }

  return {
    ...tenant,
    parent,
    branches,
  };
}

export async function getTenantCellGroups(tenantId: string) {
  const { data, error } = await supabase
    .from("cell_groups")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error) return [];
  return data;
}

export async function getTenantPastors(tenantId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("role", "PASTOR");

  if (error) return [];
  return data;
}

export async function getTenantTransactions(tenantId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
}
