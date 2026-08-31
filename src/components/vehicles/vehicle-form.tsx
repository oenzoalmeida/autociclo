'use client';

import { useState } from 'react';
import { Field, Input, Select } from '@/components/ui/input';
import { USAGE_TYPES } from '@/lib/maintenance';

export interface VehicleFormData {
  brand: string;
  model: string;
  version: string;
  year_fab: string;
  year_model: string;
  current_mileage: string;
  fuel_type: string;
  transmission: string;
  color: string;
  plate: string;
  nickname: string;
  monthly_usage: string;
  usage_type: string;
  severe_usage: boolean;
}

export const emptyVehicle: VehicleFormData = {
  brand: '',
  model: '',
  version: '',
  year_fab: '',
  year_model: '',
  current_mileage: '',
  fuel_type: 'Gasolina',
  transmission: 'Manual',
  color: '',
  plate: '',
  nickname: '',
  monthly_usage: '1000-2000',
  usage_type: 'misto',
  severe_usage: false,
};

const FUEL = ['Gasolina', 'Etanol', 'Flex', 'Diesel', 'GNV', 'Elétrico', 'Híbrido'];
const TRANSMISSION = ['Manual', 'Automática', 'CVT', 'Automatizada'];
const MONTHLY = [
  { v: 'ate-500', l: 'Até 500 km' },
  { v: '500-1000', l: '500–1.000 km' },
  { v: '1000-2000', l: '1.000–2.000 km' },
  { v: 'mais-2000', l: 'Mais de 2.000 km' },
  { v: 'nao-sei', l: 'Não sei' },
];

export function VehicleFormFields({
  data,
  onChange,
  steps,
  currentStep,
}: {
  data: VehicleFormData;
  onChange: (d: VehicleFormData) => void;
  steps?: 'all' | 'basic' | 'info' | 'ident' | 'usage';
  currentStep?: number;
}) {
  const set = (k: keyof VehicleFormData, v: string | boolean) => onChange({ ...data, [k]: v });

  if (steps === 'basic' || currentStep === 1) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Marca" htmlFor="v-brand">
            <Input id="v-brand" required value={data.brand} placeholder="Ex.: Chevrolet" onChange={(e) => set('brand', e.target.value)} />
          </Field>
          <Field label="Modelo" htmlFor="v-model">
            <Input id="v-model" required value={data.model} placeholder="Ex.: Onix" onChange={(e) => set('model', e.target.value)} />
          </Field>
        </div>
        <Field label="Versão" htmlFor="v-version" hint="Opcional. Ex.: LT 1.0, Premier, etc.">
          <Input id="v-version" value={data.version} placeholder="Ex.: LT 1.0" onChange={(e) => set('version', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ano de fabricação" htmlFor="v-yearfab">
            <Input id="v-yearfab" type="number" inputMode="numeric" value={data.year_fab} placeholder="Ex.: 2023" onChange={(e) => set('year_fab', e.target.value)} />
          </Field>
          <Field label="Ano modelo" htmlFor="v-yearmodel">
            <Input id="v-yearmodel" type="number" inputMode="numeric" required value={data.year_model} placeholder="Ex.: 2023" onChange={(e) => set('year_model', e.target.value)} />
          </Field>
        </div>
      </div>
    );
  }

  if (steps === 'info' || currentStep === 2) {
    return (
      <div className="space-y-4">
        <Field label="Quilometragem atual (km)" htmlFor="v-km">
          <Input id="v-km" type="number" inputMode="numeric" required value={data.current_mileage} placeholder="Ex.: 38450" onChange={(e) => set('current_mileage', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Combustível" htmlFor="v-fuel">
            <Select id="v-fuel" value={data.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}>
              {FUEL.map((f) => <option key={f}>{f}</option>)}
            </Select>
          </Field>
          <Field label="Câmbio" htmlFor="v-trans">
            <Select id="v-trans" value={data.transmission} onChange={(e) => set('transmission', e.target.value)}>
              {TRANSMISSION.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Cor" htmlFor="v-color">
          <Input id="v-color" value={data.color} placeholder="Ex.: Preto" onChange={(e) => set('color', e.target.value)} />
        </Field>
      </div>
    );
  }

  if (steps === 'ident' || currentStep === 3) {
    return (
      <div className="space-y-4">
        <Field label="Placa" htmlFor="v-plate" hint="Opcional.">
          <Input id="v-plate" value={data.plate} placeholder="Ex.: ABC1D23" onChange={(e) => set('plate', e.target.value.toUpperCase())} />
        </Field>
        <Field label="Apelido do veículo" htmlFor="v-nick" hint="Opcional. Ex.: Meu primeiro carro">
          <Input id="v-nick" value={data.nickname} placeholder="Ex.: Meu Onix" onChange={(e) => set('nickname', e.target.value)} />
        </Field>
      </div>
    );
  }

  if (steps === 'usage' || currentStep === 4) {
    return (
      <fieldset>
        <legend className="label">Quanto você dirige por mês?</legend>
        <div className="space-y-2">
          {MONTHLY.map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                data.monthly_usage === o.v
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <span>{o.l}</span>
              <input
                type="radio"
                name="monthly_usage"
                value={o.v}
                checked={data.monthly_usage === o.v}
                onChange={() => set('monthly_usage', o.v)}
                className="h-4 w-4 accent-brand-600"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Tipo de uso" htmlFor="v-usage-type">
            <Select id="v-usage-type" value={data.usage_type} onChange={(e) => set('usage_type', e.target.value)}>
              {USAGE_TYPES.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
            </Select>
          </Field>

          <label className="flex cursor-pointer items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={data.severe_usage}
              onChange={(e) => set('severe_usage', e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              Uso severo
              <span className="block text-xs font-normal text-muted-foreground">
                Trânsito intenso, estrada de terra, uso comercial ou condições severas podem exigir
                intervalos menores. Consulte o manual do veículo.
              </span>
            </span>
          </label>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Isso ajuda a prever quando você precisará da próxima manutenção.
        </p>
      </fieldset>
    );
  }

  // all
  return (
    <div className="space-y-4">
      <VehicleFormFields data={data} onChange={onChange} steps="basic" />
      <VehicleFormFields data={data} onChange={onChange} steps="info" />
      <VehicleFormFields data={data} onChange={onChange} steps="ident" />
    </div>
  );
}
