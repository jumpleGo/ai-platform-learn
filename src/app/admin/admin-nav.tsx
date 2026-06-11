'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Handshake, Users } from 'lucide-react';

const items = [
  { href: '/admin/courses', label: 'Курсы', icon: BookOpen },
  { href: '/admin/users', label: 'Пользователи', icon: Users },
  { href: '/admin/partners', label: 'Партнёры', icon: Handshake },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
              active
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            }`}
          >
            <Icon className={`size-4 ${active ? 'text-primary' : ''}`} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
