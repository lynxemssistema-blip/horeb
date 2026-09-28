"use client";

import { useState, useTransition } from "react";
import { setImpersonatedRole } from "@/app/actions/impersonate";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCog } from "lucide-react";
import { toast } from "sonner";

interface RoleImpersonatorProps {
  originalRole: string;
  effectiveRole: string;
  customRoles?: { value: string; label: string }[];
}

const DEFAULT_ROLES = [
  { value: "SUPERADMIN", label: "Super Admin (Padrão)" },
];

export function RoleImpersonator({ originalRole, effectiveRole, customRoles = [] }: RoleImpersonatorProps) {
  const [isPending, startTransition] = useTransition();

  // Apenas renderiza se o usuário real for SUPERADMIN
  if (originalRole !== "SUPERADMIN") return null;

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      const roleToSet = newRole === "SUPERADMIN" ? null : newRole;
      const res = await setImpersonatedRole(roleToSet);
      if (res.success) {
        toast.success(`Navegando como ${newRole === "SUPERADMIN" ? "Super Admin" : newRole}`);
        // Força o reload completo da página para atualizar o layout e a tela principal
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error("Erro ao alterar o perfil");
      }
    });
  };

  return (
    <div className="fixed bottom-20 left-4 md:bottom-6 z-[60] flex items-center bg-background border border-border p-2 rounded-full shadow-lg gap-2">
      <div className="bg-primary text-primary-foreground p-2 rounded-full">
        <UserCog size={18} />
      </div>
      <Select
        disabled={isPending}
        value={effectiveRole}
        onValueChange={(val: any) => handleRoleChange(val ?? "")}
      >
        <SelectTrigger className="w-[180px] h-9 border-none bg-transparent focus:ring-0 shadow-none font-medium">
          <SelectValue placeholder="Selecione o papel" />
        </SelectTrigger>
        <SelectContent align="end">
          {[...DEFAULT_ROLES, ...customRoles].map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
