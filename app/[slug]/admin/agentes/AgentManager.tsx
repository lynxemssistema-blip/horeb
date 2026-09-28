"use client";

import { useState } from "react";
import { Bot, Plus, Trash2, Edit2, Sparkles, AlertCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createAgentProfile, updateAgentProfile, deleteAgentProfile } from "@/app/actions/agent";
import { motion, AnimatePresence } from "framer-motion";

interface AgentProfile {
  id: string;
  name: string;
  type: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  isActive: boolean;
  tenantId: string | null;
}

export function AgentManager({ 
  initialProfiles, 
  tenantId 
}: { 
  initialProfiles: AgentProfile[], 
  tenantId: string 
}) {
  const [profiles, setProfiles] = useState<AgentProfile[]>(initialProfiles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "EXPERT",
    systemPrompt: "",
    model: "gemini-1.5-flash",
    temperature: 0.7,
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "EXPERT",
      systemPrompt: "",
      model: "gemini-1.5-flash",
      temperature: 0.7,
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const handleEdit = (profile: AgentProfile) => {
    setFormData({
      name: profile.name,
      type: profile.type,
      systemPrompt: profile.systemPrompt,
      model: profile.model,
      temperature: profile.temperature,
    });
    setEditingId(profile.id);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.systemPrompt) return;
    
    setIsLoading(true);
    if (editingId) {
      const res = await updateAgentProfile(editingId, formData);
      if (res.success && res.profile) {
        setProfiles(profiles.map(p => p.id === editingId ? res.profile as AgentProfile : p));
      }
    } else {
      const res = await createAgentProfile({ ...formData, tenantId });
      if (res.success && res.profile) {
        setProfiles([res.profile as AgentProfile, ...profiles]);
      }
    }
    setIsLoading(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este agente?")) {
      setIsLoading(true);
      const res = await deleteAgentProfile(id);
      if (res.success) {
        setProfiles(profiles.filter(p => p.id !== id));
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Super Admin: Agentes de IA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os prompts, as personalidades e orquestração do Check-in de Alma (Voz & Texto).
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button onClick={() => setIsCreating(true)} className="gap-2 font-semibold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Novo Agente
          </Button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {(isCreating || editingId) && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-card border border-border/50 rounded-xl p-6 shadow-xl shadow-black/5"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                {editingId ? "Editar Personalidade" : "Criar Nova Personalidade"}
              </h3>
              <Button variant="ghost" size="icon" onClick={resetForm} disabled={isLoading}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Agente</label>
                  <Input 
                    placeholder="Ex: Pastor Conselheiro" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Agente</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    disabled={isLoading}
                  >
                    <option value="EXPERT">Especialista (Aconselhamento, Teologia, etc)</option>
                    <option value="ORCHESTRATOR">Orquestrador (Direciona o fluxo)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  System Prompt (A Alma do Agente)
                </label>
                <Textarea 
                  placeholder="Instruções de como este agente deve se comportar, qual o tom de voz, regras de segurança, etc." 
                  className="min-h-[150px] resize-y font-mono text-xs bg-muted/30"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelo de IA</label>
                  <Input 
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    disabled={isLoading}
                  />
                  <p className="text-[10px] text-muted-foreground">Padrão: gemini-1.5-flash (Ideal para voz e agilidade)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temperatura (Criatividade: 0.0 a 1.0)</label>
                  <Input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={resetForm} disabled={isLoading}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                  <Save className="w-4 h-4" /> Salvar Agente
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <motion.div 
            key={profile.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative"
          >
            {profile.type === 'ORCHESTRATOR' && (
              <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                Orquestrador
              </div>
            )}
            <div className="p-5">
              <h4 className="font-bold text-lg mb-1 pr-16 truncate">{profile.name}</h4>
              <div className="flex gap-2 items-center text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                  <Bot className="w-3 h-3" /> {profile.model}
                </span>
                <span className="bg-muted px-2 py-0.5 rounded-full">Temp: {profile.temperature}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-6 font-mono bg-muted/30 p-2 rounded-md border border-border/50">
                {profile.systemPrompt}
              </p>
              
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${profile.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {profile.isActive ? 'Ativo' : 'Inativo'}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(profile)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(profile.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {profiles.length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
            <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground">Nenhum agente configurado</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro agente de IA para interagir com os usuários.</p>
            <Button onClick={() => setIsCreating(true)} variant="outline">Configurar Primeira IA</Button>
          </div>
        )}
      </div>
    </div>
  );
}
