'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import {
  VehicleFormFields,
  type VehicleFormData,
} from '@/components/vehicles/vehicle-form';
import { useToast } from '@/components/ui/toast';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [data, setData] = useState<VehicleFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: v } = await supabase.from('vehicles').select('*').eq('id', params.id).single();
      setVehicle(v);
      setData({
        brand: v?.brand ?? '',
        model: v?.model ?? '',
        version: v?.version ?? '',
        year_fab: v?.year_fab ? String(v.year_fab) : '',
        year_model: v?.year_model ? String(v.year_model) : '',
        current_mileage: v?.current_mileage ? String(v.current_mileage) : '',
        fuel_type: v?.fuel_type ?? 'Gasolina',
        transmission: v?.transmission ?? 'Manual',
        color: v?.color ?? '',
        plate: v?.plate ?? '',
        nickname: v?.nickname ?? '',
        monthly_usage: v?.monthly_usage ?? '1000-2000',
        usage_type: v?.usage_type ?? 'misto',
        severe_usage: v?.severe_usage ?? false,
      });
    };
    load();
  }, [params.id]);

  const save = async () => {
    if (!data || !vehicle) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('vehicles')
      .update({
        brand: data.brand,
        model: data.model,
        version: data.version || null,
        year_fab: data.year_fab ? Number(data.year_fab) : null,
        year_model: Number(data.year_model),
        fuel_type: data.fuel_type,
        transmission: data.transmission,
        color: data.color || null,
        plate: data.plate || null,
        nickname: data.nickname || null,
        monthly_usage: data.monthly_usage,
        usage_type: data.usage_type,
        severe_usage: data.severe_usage,
      })
      .eq('id', vehicle.id);
    if (error) {
      toast('Não foi possível salvar.', 'error');
    } else {
      toast('Veículo atualizado.');
    }
    setSaving(false);
  };

  const archive = async () => {
    if (!vehicle) return;
    const supabase = createClient();
    await supabase.from('vehicles').update({ archived: !vehicle.archived }).eq('id', vehicle.id);
    toast(vehicle.archived ? 'Veículo reativado.' : 'Veículo arquivado.');
    router.push('/garagem');
  };

  const remove = async () => {
    if (!vehicle) return;
    const supabase = createClient();
    await supabase.from('vehicles').delete().eq('id', vehicle.id);
    toast('Veículo excluído.');
    window.location.href = '/garagem';
  };

  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/garagem/${params.id}`} className="text-sm text-brand-600 dark:text-brand-400">← Voltar</Link>
      <h1 className="text-2xl font-extrabold">Editar veículo</h1>

      <div className="card space-y-5 p-5">
        <VehicleFormFields data={data} onChange={setData} steps="all" />

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            variant={vehicle?.archived ? 'secondary' : 'ghost'}
            onClick={() => setConfirmArchive(true)}
          >
            {vehicle?.archived ? 'Reativar' : 'Arquivar'}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-red-600">
            Excluir
          </Button>
          <Button loading={saving} onClick={save}>
            Salvar
          </Button>
        </div>
      </div>

      <Modal open={confirmArchive} onClose={() => setConfirmArchive(false)} title={vehicle?.archived ? 'Reativar veículo' : 'Arquivar veículo'} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmArchive(false)}>Cancelar</Button>
            <Button onClick={archive}>{vehicle?.archived ? 'Reativar' : 'Arquivar'}</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {vehicle?.archived
            ? 'Este veículo voltará a aparecer na sua garagem.'
            : 'O veículo será ocultado da sua garagem, mas todo o histórico será preservado. Você pode reativá-lo depois.'}
        </p>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Excluir veículo"
        message="Tem certeza que deseja excluir este veículo e todo o seu histórico? Esta ação não pode ser desfeita. Para manter o histórico, prefira arquivar."
        confirmLabel="Excluir definitivamente"
      />
    </div>
  );
}
