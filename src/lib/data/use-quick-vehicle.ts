'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export function useQuickVehicle(preSelected?: string) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [selected, setSelected] = useState(preSelected ?? '');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('vehicles').select('*').eq('user_id', user.id).eq('archived', false);
      setVehicles(data ?? []);
      if (data && data.length === 1) {
        setSelected((s) => s || data[0].id);
      } else if (data && data.length > 1 && preSelected) {
        // mantém seleção
      }
    };
    load();
  }, [preSelected]);

  return { vehicles, selected, setSelected };
}
