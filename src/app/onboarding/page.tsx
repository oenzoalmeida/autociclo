'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createVehicleWithDefaults } from '@/lib/data/vehicles';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  VehicleFormFields,
  emptyVehicle,
  type VehicleFormData,
} from '@/components/vehicles/vehicle-form';

const STEPS = ['Veículo', 'Informações', 'Identificação', 'Uso'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<VehicleFormData>(emptyVehicle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (isAdmin) {
        router.push('/admin');
      }
    };
    init();
  }, [router]);

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Você precisa estar conectado.');
      setLoading(false);
      return;
    }

    let photoUrl: string | null = null;
    if (photo) {
      try {
        const res = await fetch(photo);
        const blob = await res.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        const path = `vehicles/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('vehicle-files')
          .upload(path, blob, { contentType: blob.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
        photoUrl = pub.publicUrl;
      } catch {
        // foto é opcional
      }
    }

    const { error: veError } = await createVehicleWithDefaults(supabase, user.id, {
      brand: data.brand,
      model: data.model,
      version: data.version || null,
      year_fab: data.year_fab ? Number(data.year_fab) : null,
      year_model: Number(data.year_model),
      current_mileage: Number(data.current_mileage) || 0,
      fuel_type: data.fuel_type,
      transmission: data.transmission,
      color: data.color || null,
      plate: data.plate || null,
      nickname: data.nickname || null,
      photo_url: photoUrl,
      monthly_usage: data.monthly_usage,
    });

    if (veError) {
      setError('Não foi possível salvar o veículo. Tente novamente.');
      setLoading(false);
      return;
    }

    await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id);
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push('/home?msg=' + encodeURIComponent('Seu AutoCiclo está pronto!')), 1200);
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center dark:bg-[hsl(var(--background))]">
        <Logo size={48} />
        <h1 className="mt-6 text-3xl font-extrabold">Seu AutoCiclo está pronto.</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Já criamos as bases do seu prontuário digital. Daqui para frente é só manter seu carro em
          dia.
        </p>
        <div className="mt-6 h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const canNext =
    (step === 1 && data.brand && data.model && data.year_model) ||
    (step === 2 && data.current_mileage !== '') ||
    step === 3 ||
    step === 4;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[hsl(var(--background))]">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo size={30} />
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          {STEPS.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  i + 1 <= step ? 'bg-brand-600 text-white' : 'bg-muted'
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-2 bg-border" />}
            </span>
          ))}
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-extrabold">Vamos cadastrar seu primeiro veículo.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1 && 'Comece pelas informações básicas do seu carro.'}
            {step === 2 && 'Agora, quanto ele tem rodado e suas características.'}
            {step === 3 && 'Identificação opcional para deixar tudo pessoal.'}
            {step === 4 && 'Essas informações ajudam a prever as próximas manutenções.'}
          </p>

          <div className="mt-8">
            <VehicleFormFields data={data} onChange={setData} currentStep={step} />

            {step === 3 && (
              <div className="mt-4">
                <span className="label">Foto do veículo (opcional)</span>
                {photo ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="Foto do veículo" className="h-20 w-20 rounded-xl object-cover" />
                    <Button type="button" variant="secondary" size="sm" onClick={() => setPhoto(null)}>
                      Remover foto
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground hover:bg-muted">
                    <span className="text-2xl">📷</span>
                    <span className="mt-1">Adicionar foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPhoto(URL.createObjectURL(f));
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || loading}>
              Voltar
            </Button>
            {step < 4 ? (
              <Button disabled={!canNext || loading} onClick={() => setStep((s) => s + 1)}>
                Continuar
              </Button>
            ) : (
              <Button loading={loading} onClick={handleFinish}>
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
