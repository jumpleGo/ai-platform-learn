import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { adminDb } from '@/lib/firebase/admin';
import { getPartnerBySlug } from '@/lib/db/partners';
import type { UserDoc } from '@/lib/types';

// Полоса «Вы пришли от {партнёр}»: для гостя — по cookie, для юзера — по partnerId профиля.
// Атрибуция пишет в partnerId slug из cookie, поэтому в обоих случаях ищем по slug
export async function PartnerBar() {
  const session = await getSession();
  let slug: string | null | undefined;
  if (session) {
    const profile = await adminDb.doc(`users/${session.uid}`).get();
    slug = (profile.data() as UserDoc | undefined)?.partnerId;
  } else {
    slug = (await cookies()).get('partner')?.value;
  }
  const partner = slug ? await getPartnerBySlug(slug) : null;
  if (!partner) return null;
  return (
    <div
      data-app-partner-bar
      className="px-4 py-2 text-center text-sm text-white"
      style={{ backgroundColor: partner.brandColor ?? '#18181b' }}
    >
      {partner.logoUrl && (
        <img src={partner.logoUrl} alt="" className="mr-2 inline-block h-5 align-middle" />
      )}
      Вы пришли от партнёра <span className="font-semibold">{partner.name}</span>
    </div>
  );
}
