import { FormEvent, useState } from "react";
import Head from "next/head";
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n";

type FieldName = "temporaryPassword" | "newPassword" | "confirmPassword";

function PasswordField({
  id,
  label,
  value,
  placeholder,
  visible,
  onToggle,
  onChange,
  disabled,
  showLabel,
  hideLabel,
}: {
  id: FieldName;
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  disabled: boolean;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete={id === "temporaryPassword" ? "current-password" : "new-password"}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147677] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          disabled={disabled}
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function FirstPasswordPage() {
  const { t } = useLanguage();
  const { setFirstPassword, logout, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState({
    temporaryPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visible, setVisible] = useState({
    temporaryPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const temporaryPassword = form.temporaryPassword.trim();
    const newPassword = form.newPassword;
    const confirmPassword = form.confirmPassword;

    if (newPassword.length < 6) {
      setError(t("passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    if (newPassword === temporaryPassword) {
      setError(t("passwordMustDiffer"));
      return;
    }

    setIsSaving(true);
    try {
      await setFirstPassword(temporaryPassword, newPassword, confirmPassword);
    } catch (err: any) {
      setError(err?.message || t("firstPasswordFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const busy = isSaving || authLoading;

  return (
    <>
      <Head>
        <title>
          {t("firstPasswordTitle")} | {t("climateInformationSystem")}
        </title>
      </Head>
      <div
        className="flex min-h-screen items-center justify-center p-6"
        style={{ background: "linear-gradient(135deg, #e5f3ff 0%, #d6e8fc 100%)" }}
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#147677] text-white">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t("firstPasswordTitle")}</h1>
            <p className="mt-2 text-sm text-slate-600">{t("firstPasswordSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <PasswordField
              id="temporaryPassword"
              label={t("temporaryPassword")}
              placeholder={t("enterTemporaryPassword")}
              value={form.temporaryPassword}
              visible={visible.temporaryPassword}
              onToggle={() => setVisible((current) => ({ ...current, temporaryPassword: !current.temporaryPassword }))}
              onChange={(value) => updateField("temporaryPassword", value)}
              disabled={busy}
              showLabel={t("showPassword")}
              hideLabel={t("hidePassword")}
            />
            <PasswordField
              id="newPassword"
              label={t("newPassword")}
              placeholder={t("enterNewPassword")}
              value={form.newPassword}
              visible={visible.newPassword}
              onToggle={() => setVisible((current) => ({ ...current, newPassword: !current.newPassword }))}
              onChange={(value) => updateField("newPassword", value)}
              disabled={busy}
              showLabel={t("showPassword")}
              hideLabel={t("hidePassword")}
            />
            <PasswordField
              id="confirmPassword"
              label={t("confirmNewPassword")}
              placeholder={t("enterConfirmPassword")}
              value={form.confirmPassword}
              visible={visible.confirmPassword}
              onToggle={() => setVisible((current) => ({ ...current, confirmPassword: !current.confirmPassword }))}
              onChange={(value) => updateField("confirmPassword", value)}
              disabled={busy}
              showLabel={t("showPassword")}
              hideLabel={t("hidePassword")}
            />

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#147677] text-sm font-medium text-white hover:bg-[#147677]/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settingPassword")}
                </>
              ) : (
                t("setNewPassword")
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="mt-4 w-full text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </>
  );
}
