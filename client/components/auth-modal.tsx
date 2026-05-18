"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInOrSignUp,
  signInWithMagicLink,
} from "@/lib/auth";
import { Mail, KeyRound } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type AuthMethod = "password" | "magiclink";

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError(null);
      setMagicLinkSent(false);
    }
  }, [open]);

  useEffect(() => {
    setError(null);
    setMagicLinkSent(false);
  }, [authMethod]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInOrSignUp(email, password);
      setEmail("");
      setPassword("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputClick = (inputRef: React.RefObject<HTMLInputElement>) => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md p-0 overflow-hidden'>
        <div className='p-6 pb-8 pt-12'>
          <div className='flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-8'>
            <button
              type='button'
              onClick={() => setAuthMethod("password")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                authMethod === "password"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <KeyRound className='w-3.5 h-3.5' />
              Mot de passe
            </button>
            <button
              type='button'
              onClick={() => setAuthMethod("magiclink")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                authMethod === "magiclink"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Mail className='w-3.5 h-3.5' />
              Lien magique
            </button>
          </div>

          <div className='mb-6 text-center'>
            <h2 className='text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100'>
              {magicLinkSent ? "Courriel envoyé" : "Accéder à votre compte"}
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              {magicLinkSent
                ? `Un lien a été envoyé à ${email}. Cliquez dessus pour vous connecter ou créer votre compte.`
                : "Connectez-vous ou créez un compte pour sauvegarder vos rues favorites"}
            </p>
          </div>

          {magicLinkSent ? (
            <div className='space-y-4'>
              <div className='text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-100 dark:border-green-900/50'>
                Le lien expire après un court délai. Vérifiez vos indésirables si
                vous ne le voyez pas.
              </div>
              <Button
                type='button'
                variant='outline'
                className='w-full h-11'
                onClick={() => {
                  setMagicLinkSent(false);
                  setError(null);
                }}
              >
                Renvoyer un lien
              </Button>
              <Button
                type='button'
                variant='ghost'
                className='w-full'
                onClick={() => onOpenChange(false)}
              >
                Fermer
              </Button>
            </div>
          ) : (
            <form
              onSubmit={
                authMethod === "password"
                  ? handlePasswordSubmit
                  : handleMagicLinkSubmit
              }
              className='space-y-4'
            >
              <div className='space-y-1.5'>
                <Input
                  ref={emailInputRef}
                  id='email'
                  type='email'
                  placeholder='Adresse e-mail'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onTouchStart={() => handleInputClick(emailInputRef)}
                  required
                  disabled={loading}
                  autoComplete='email'
                  className='h-11 text-base'
                />
              </div>

              {authMethod === "password" && (
                <div className='space-y-1.5'>
                  <Input
                    ref={passwordInputRef}
                    id='password'
                    type='password'
                    placeholder='Mot de passe'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onTouchStart={() => handleInputClick(passwordInputRef)}
                    required
                    disabled={loading}
                    minLength={6}
                    autoComplete='current-password'
                    className='h-11 text-base'
                  />
                  <p className='text-xs text-gray-500 dark:text-gray-400 px-1'>
                    Minimum 6 caractères — un compte sera créé si nécessaire
                  </p>
                </div>
              )}

              {error && (
                <div className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/50 animate-in fade-in slide-in-from-top-1 duration-200'>
                  {error}
                </div>
              )}

              <Button
                type='submit'
                className='w-full h-11 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md'
                disabled={loading}
              >
                {loading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                    Veuillez patienter...
                  </span>
                ) : authMethod === "magiclink" ? (
                  "Envoyer le lien magique"
                ) : (
                  "Continuer"
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
