import { FormEvent, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Eye, EyeOff, Globe, Loader2, Lock, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const copy = {
  en: {
    title: "Forgot password",
    intro: "Enter the email and phone number saved on your account, then choose where to receive a code. The password changes only after that code confirms it is you.",
    email: "Email",
    phone: "Phone number",
    sendBy: "Send the code by",
    emailOption: "Email",
    smsOption: "SMS",
    send: "Send code",
    sending: "Sending...",
    choose: "Choose email or SMS.",
    codeIntroEmail: "We sent a code to your email. Enter it to confirm it is you.",
    codeIntroSms: "We sent a code by SMS. Enter it to confirm it is you.",
    code: "Code",
    confirm: "Confirm",
    confirming: "Checking...",
    again: "Send another code",
    passwordIntro: "It is you. Choose a new password.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    change: "Change password",
    saving: "Saving...",
    done: "Password updated. Sign in with the new password.",
    signIn: "Sign in",
    back: "Back to login",
    missing: "Fill in every field.",
    mismatch: "Passwords do not match.",
    short: "Password must be at least 6 characters.",
    failed: "Something went wrong. Try again.",
    unavailable: "We can only change a password when this account has the same email and phone number saved. Contact an admin.",
    badCode: "That code is not correct, or it has expired. Ask for a new code.",
    sendFailed: "The code could not be sent. Choose the other option, or try again.",
    wait: "A code was just sent. Wait a moment before asking for another.",
  },
  rw: {
    title: "Wibagiwe ijambo ry'ibanga",
    intro: "Injiza imeyili na telefoni byabitswe kuri konti yawe, hanyuma uhitemo aho tuzohereza kode. Ijambo ry'ibanga rihinduka nyuma yo kwemeza ko ari wowe.",
    email: "Imeyili",
    phone: "Telefoni",
    sendBy: "Ohereza kode kuri",
    emailOption: "Imeyili",
    smsOption: "SMS",
    send: "Ohereza kode",
    sending: "Iroherezwa...",
    choose: "Hitamo imeyili cyangwa SMS.",
    codeIntroEmail: "Twakoherereje kode kuri imeyili. Yinjize wemeze ko ari wowe.",
    codeIntroSms: "Twakoherereje kode kuri SMS. Yinjize wemeze ko ari wowe.",
    code: "Kode",
    confirm: "Emeza",
    confirming: "Birimo kwemezwa...",
    again: "Ohereza indi kode",
    passwordIntro: "Twemeje ko ari wowe. Hitamo ijambo rishya ry'ibanga.",
    newPassword: "Ijambo rishya",
    confirmPassword: "Emeza ijambo",
    change: "Hindura ijambo",
    saving: "Birimo kubikwa...",
    done: "Ijambo ry'ibanga ryahinduwe. Injira ukoresheje iryo rishya.",
    signIn: "Injira",
    back: "Subira kwinjira",
    missing: "Uzuza ibisabwa byose.",
    mismatch: "Amagambo y'ibanga ntabwo ahuye.",
    short: "Ijambo ry'ibanga rigomba kuba rifite byibuze inyuguti 6.",
    failed: "Habaye ikibazo. Ongera ugerageze.",
    unavailable: "Ijambo ry'ibanga rihindurwa gusa iyo konti ifite imeyili na telefoni byabitswe. Hamagara umuyobozi.",
    badCode: "Kode si yo cyangwa yarangiye. Saba indi.",
    sendFailed: "Kode ntiyoherejwe. Hitamo indi nzira cyangwa ongera ugerageze.",
    wait: "Kode yaherejwe. Tegereza gato mbere yo gusaba indi.",
  },
} as const;

type Step = "contact" | "code" | "password" | "done";
type Channel = "email" | "sms";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Copy = (typeof copy)[keyof typeof copy];

function messageFor(code: string, fallback: string, t: Copy) {
  if (code === "PASSWORD_RESET_UNAVAILABLE") return t.unavailable;
  if (code === "PASSWORD_RESET_BAD_CODE") return t.badCode;
  if (code === "PASSWORD_RESET_SEND_FAILED") return t.sendFailed;
  if (code === "PASSWORD_RESET_WAIT") return t.wait;
  return fallback || t.failed;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<"en" | "rw">("en");
  const t = copy[locale];
  const [step, setStep] = useState<Step>("contact");
  const [channel, setChannel] = useState<Channel | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [form, setForm] = useState({
    email: "",
    phone: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const set = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const post = async (path: string, body: Record<string, string>) => {
    const response = await fetch(`${API}/api/auth/forgot-password/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(payload.message || ""), { code: payload.code || "" });
    }
    return payload;
  };

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.email || !form.phone) {
      setError(t.missing);
      return;
    }
    if (channel !== "email" && channel !== "sms") {
      setError(t.choose);
      return;
    }
    try {
      setBusy(true);
      await post("request", { email: form.email, phone: form.phone, channel, locale });
      setStep("code");
    } catch (err) {
      const failure = err as Error & { code?: string };
      setError(messageFor(failure.code || "", failure.message, t));
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(form.code.trim())) {
      setError(t.badCode);
      return;
    }
    try {
      setBusy(true);
      const payload = await post("confirm", { email: form.email, phone: form.phone, code: form.code.trim() });
      setResetToken(payload.data?.resetToken || "");
      setStep("password");
    } catch (err) {
      const failure = err as Error & { code?: string };
      setError(messageFor(failure.code || "", failure.message, t));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.newPassword || !form.confirmPassword) {
      setError(t.missing);
      return;
    }
    if (form.newPassword.length < 6) {
      setError(t.short);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError(t.mismatch);
      return;
    }
    try {
      setBusy(true);
      await post("complete", {
        email: form.email,
        phone: form.phone,
        resetToken,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setStep("done");
    } catch (err) {
      const failure = err as Error & { code?: string };
      setError(messageFor(failure.code || "", failure.message, t));
    } finally {
      setBusy(false);
    }
  };

  const optionClass = (value: Channel) =>
    `flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
      channel === value ? "border-[#147677] bg-[#f3fafa] text-[#147677]" : "border-slate-200 text-slate-700"
    }`;

  return (
    <>
      <Head><title>{`${t.title} | Teganyamuhinzi`}</title></Head>
      <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #e5f3ff 0%, #d6e8fc 100%)" }}>
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Globe className="mr-1 h-4 w-4" />
                  {locale === "en" ? "English" : "Kinyarwanda"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale("rw")}>Kinyarwanda</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {step === "code" ? (channel === "sms" ? t.codeIntroSms : t.codeIntroEmail) : step === "password" ? t.passwordIntro : step === "done" ? t.done : t.intro}
          </p>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {step === "contact" && (
            <form onSubmit={sendCode} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="pl-10" autoComplete="email" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t.phone}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="pl-10" autoComplete="tel" placeholder="07XXXXXXXX" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-900">{t.sendBy}</p>
                <div className="flex gap-2">
                  <button type="button" className={optionClass("email")} onClick={() => { setChannel("email"); setError(""); }}>{t.emailOption}</button>
                  <button type="button" className={optionClass("sms")} onClick={() => { setChannel("sms"); setError(""); }}>{t.smsOption}</button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#147677] text-white hover:bg-[#0f5f60]" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {busy ? t.sending : t.send}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={confirmCode} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">{t.code}</Label>
                <Input id="code" inputMode="numeric" maxLength={6} value={form.code} onChange={(e) => set("code", e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" />
              </div>
              <Button type="submit" className="w-full bg-[#147677] text-white hover:bg-[#0f5f60]" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {busy ? t.confirming : t.confirm}
              </Button>
              <button type="button" className="w-full text-sm font-semibold text-[#147677]" onClick={() => { setStep("contact"); setError(""); set("code", ""); }}>
                {t.again}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={changePassword} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">{t.newPassword}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input id="newPassword" type={show ? "text" : "password"} value={form.newPassword} onChange={(e) => set("newPassword", e.target.value)} className="pl-10 pr-10" autoComplete="new-password" />
                  <button type="button" onClick={() => setShow((value) => !value)} className="absolute right-3 top-3 text-gray-400">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input id="confirmPassword" type={show ? "text" : "password"} value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} className="pl-10" autoComplete="new-password" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#147677] text-white hover:bg-[#0f5f60]" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {busy ? t.saving : t.change}
              </Button>
            </form>
          )}

          {step === "done" && (
            <Button className="mt-6 w-full bg-[#147677] text-white hover:bg-[#0f5f60]" onClick={() => router.push("/login")}>
              {t.signIn}
            </Button>
          )}

          {step !== "done" && (
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm font-semibold text-[#147677] hover:underline">{t.back}</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
