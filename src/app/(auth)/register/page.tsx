'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  signInWithPopup,
} from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createUserProfile } from '../actions';
import { exchangeIdTokenForSession } from '../session-client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function finishRegister() {
    router.push('/');
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const cred = await createUserWithEmailAndPassword(clientAuth, email, password);
      await createUserProfile(cred.user.uid, email, name);
      await exchangeIdTokenForSession(cred.user);
      await finishRegister();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться');
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    try {
      const cred = await signInWithPopup(clientAuth, new GoogleAuthProvider());
      await exchangeIdTokenForSession(cred.user);
      if (getAdditionalUserInfo(cred)?.isNewUser) {
        await createUserProfile(
          cred.user.uid,
          cred.user.email ?? '',
          cred.user.displayName ?? '',
        );
      }
      await finishRegister();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться');
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Электронная почта</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Зарегистрироваться
          </Button>
        </form>
        <Button variant="outline" disabled={pending} onClick={handleGoogle}>
          Войти через Google
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="underline underline-offset-4">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
