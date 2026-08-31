'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Skeleton } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row'];
type RecordItem = Database['public']['Tables']['maintenance_record_items']['Row'];
type Attachment = Database['public']['Tables']['attachments']['Row'];

export default function RecordDetailPage() {
  const params = useParams<{ id: string; recordId: string }>();
  const { toast } = useToast();
  const [rec, setRec] = useState<MaintenanceRecord | null>(null);
  const [items, setItems] = useState<RecordItem[]>([]);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [r, ri, at] = await Promise.all([
        supabase.from('maintenance_records').select('*').eq('id', params.recordId).single(),
        supabase.from('maintenance_record_items').select('*').eq('record_id', params.recordId),
        supabase.from('attachments').select('*').eq('record_id', params.recordId),
      ]);
      const recordItems = ri.data ?? [];
      let names: Record<string, string> = {};
      if (recordItems.length) {
        const ids = recordItems.map((i) => i.maintenance_item_id);
        const { data: mitems } = await supabase
          .from('vehicle_maintenance_items')
          .select('id, name')
          .in('id', ids);
        names = Object.fromEntries((mitems ?? []).map((m) => [m.id, m.name]));
      }
      setRec(r.data);
      setItems(recordItems);
      setItemNames(names);
      setAttachments(at.data ?? []);
      setLoading(false);
    };
    load();
  }, [params.recordId]);

  const remove = async () => {
    if (!rec) return;
    const supabase = createClient();
    await supabase.from('maintenance_records').delete().eq('id', rec.id);
    toast('Registro excluído.');
    window.location.href = `/garagem/${params.id}/historico`;
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!rec) return <p className="text-muted-foreground">Registro não encontrado.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/garagem/${params.id}/historico`} className="text-sm text-brand-600 dark:text-brand-400">← Voltar</Link>

      <div className="card p-6">
        <div className="text-sm font-bold text-brand-600 dark:text-brand-400">
          {new Date(rec.service_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold">{rec.note || 'Manutenção'}</h1>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <LabelValue label="Quilometragem" value={`${formatNumber(rec.mileage)} km`} />
          <LabelValue label="Oficina" value={rec.workshop || '—'} />
          <LabelValue label="Valor total" value={formatCurrency(rec.total_amount)} />
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-bold">Serviços realizados</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum serviço detalhado registrado.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <span className="font-medium">{itemNames[i.maintenance_item_id] ?? 'Serviço'}</span>
                {i.amount ? <span>{formatCurrency(i.amount)}</span> : <span className="text-muted-foreground">—</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-bold">Anexos</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {attachments.map((a) => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm hover:bg-muted">
                <span>📎</span>
                <span className="truncate">{a.file_name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setDel(true)} className="text-sm font-semibold text-red-600">Excluir registro</button>

      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        onConfirm={remove}
        title="Excluir registro"
        message="Tem certeza que deseja excluir este registro? Os anexos também serão removidos."
      />
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
