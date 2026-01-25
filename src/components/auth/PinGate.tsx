"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const PIN_STORAGE_KEY = "rva-miles-pin-verified";
const PIN_HASH_KEY = "rva-miles-pin-hash";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PinGateProps {
  children: React.ReactNode;
}

// Simple hash function for PIN (not cryptographically secure, but fine for this use case)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export default function PinGate({ children }: PinGateProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if already verified this session
    const verified = localStorage.getItem(PIN_STORAGE_KEY);
    const storedHash = localStorage.getItem(PIN_HASH_KEY);

    if (verified) {
      const verifiedTime = parseInt(verified, 10);
      if (Date.now() - verifiedTime < SESSION_DURATION) {
        setIsVerified(true);
        return;
      }
    }

    // Check if PIN is set up
    if (storedHash) {
      setIsVerified(false);
      setIsSettingUp(false);
    } else {
      setIsVerified(false);
      setIsSettingUp(true);
    }
  }, []);

  const handleSetupPin = () => {
    setError("");

    if (pin.length < 4) {
      setError("PIN must be at least 4 characters");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    localStorage.setItem(PIN_HASH_KEY, hashPin(pin));
    localStorage.setItem(PIN_STORAGE_KEY, Date.now().toString());
    setIsVerified(true);
  };

  const handleVerifyPin = () => {
    setError("");
    const storedHash = localStorage.getItem(PIN_HASH_KEY);

    if (hashPin(pin) === storedHash) {
      localStorage.setItem(PIN_STORAGE_KEY, Date.now().toString());
      setIsVerified(true);
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (isSettingUp) {
        handleSetupPin();
      } else {
        handleVerifyPin();
      }
    }
  };

  // Loading state
  if (isVerified === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Verified - show app
  if (isVerified) {
    return <>{children}</>;
  }

  // PIN setup screen
  if (isSettingUp) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">RVA Miles</h1>
            <p className="text-slate-400 text-sm">
              Set up a PIN to protect your mileage data
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Create PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button className="w-full" size="lg" onClick={handleSetupPin}>
              Set PIN
            </Button>
          </div>

          <p className="text-slate-500 text-xs text-center mt-4">
            PIN is stored locally on this device only
          </p>
        </Card>
      </div>
    );
  }

  // PIN entry screen
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">RVA Miles</h1>
          <p className="text-slate-400 text-sm">Enter your PIN to continue</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-4 bg-slate-700 border border-slate-600 rounded-xl text-white text-center text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button className="w-full" size="lg" onClick={handleVerifyPin}>
            Unlock
          </Button>
        </div>

        <button
          onClick={() => {
            if (confirm("This will reset your PIN and ALL trip data. Continue?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full mt-4 text-slate-500 text-xs hover:text-slate-400"
        >
          Forgot PIN? Reset all data
        </button>
      </Card>
    </div>
  );
}
