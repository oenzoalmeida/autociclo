import type { Metadata } from 'next';
import VehicleDashboard from '@/components/vehicle/vehicle-dashboard';

export const metadata: Metadata = {
  title: 'Veículo',
};

export default function VehiclePage() {
  return <VehicleDashboard />;
}
