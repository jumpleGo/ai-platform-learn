import { PartnerBar } from '@/components/partner-bar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PartnerBar />
      <div className="flex min-h-svh items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
