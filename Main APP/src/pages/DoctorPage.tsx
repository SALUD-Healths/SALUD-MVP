import { DoctorQRScanner } from '@/components/doctor';
import { PageHeader } from '@/components/layout';

export function DoctorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Portal"
        description="Scan patient QR codes to access shared medical records"
      />

      <DoctorQRScanner />
    </div>
  );
}
