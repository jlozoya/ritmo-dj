'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from 'react-aria-components';
import { Headphones, LogOut, UserRound } from 'lucide-react';
import { Brand } from './brand';
import type { DJUser } from '@/types/music';

export function DJLayout({
  user,
  onSignOut,
  active,
  status,
  children,
}: {
  user: DJUser;
  onSignOut: () => void;
  active: 'dashboard' | 'profile';
  status?: ReactNode;
  children: ReactNode;
}) {
  const links = [
    { href: '/', label: 'Cabina', id: 'dashboard', icon: Headphones },
    { href: '/perfil', label: 'Perfil', id: 'profile', icon: UserRound },
  ];
  return (
    <div className="app workspace-app">
      <aside className="sidebar">
        <Brand />
        <nav className="workspace-nav" aria-label="Menú principal">
          {links.map(({ href, label, id, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              aria-current={active === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/perfil"
            className="profile"
            aria-label="Configurar perfil"
          >
            <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
            <span>
              {user.name}
              <small>{user.email}</small>
            </span>
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="workspace-header">
          <nav className="workspace-mobile-nav" aria-label="Navegación">
            {links.map(({ href, label, id }) => (
              <Link
                key={id}
                href={href}
                aria-current={active === id ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-right">
            {status && <span className="workspace-status">{status}</span>}
            <Button className="outline sign-out" onPress={onSignOut}>
              <LogOut size={15} />
              Cerrar sesión
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
