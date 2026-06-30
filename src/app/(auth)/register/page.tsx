'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ensureUserProfile } from '../actions';
import {
  authErrorMessage,
  exchangeIdTokenForSession,
  signInWithGoogleAndSession,
} from '../session-client';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(false);
  const consented = dataConsent && cookieConsent;

  function finishRegister() {
    // полный переход: гарантированно подхватывает только что выставленную session-cookie
    window.location.assign('/');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const cred = await createUserWithEmailAndPassword(clientAuth, email, password);
      const idToken = await cred.user.getIdToken();
      await exchangeIdTokenForSession(idToken);
      await ensureUserProfile(idToken, name);
      finishRegister();
    } catch (err) {
      setError(authErrorMessage(err));
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    try {
      await signInWithGoogleAndSession();
      finishRegister();
    } catch (err) {
      setError(authErrorMessage(err));
      setPending(false);
    }
  }

  return (
    <Card className="w-full rounded-2xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-sans text-2xl font-semibold tracking-tight">Регистрация</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              autoComplete="name"
              required
              className="h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Электронная почта</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Минимум 6 символов</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="data-consent" className="items-start gap-2.5 text-[13px] leading-snug font-normal text-muted-foreground">
              <Checkbox
                id="data-consent"
                className="mt-0.5"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
              />
              <span>Согласен на обработку и передачу персональных данных</span>
            </Label>
            <Label htmlFor="cookie-consent" className="items-start gap-2.5 text-[13px] leading-snug font-normal text-muted-foreground">
              <Checkbox
                id="cookie-consent"
                className="mt-0.5"
                checked={cookieConsent}
                onChange={(e) => setCookieConsent(e.target.checked)}
              />
              <span>Согласен на использование файлов cookie</span>
            </Label>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={pending || !consented} className="mt-1 h-11 rounded-xl text-[15px]">
            {pending ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          или
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" disabled={pending || !consented} onClick={handleGoogle} className="h-11 rounded-xl">
          Войти через Google
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
