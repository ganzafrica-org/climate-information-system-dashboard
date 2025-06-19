import React, { useState } from "react";
import { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, User, Lock, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Image from "next/image";

const Login: NextPage = () => {
  const { t, locale, changeLanguage } = useLanguage();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.password) {
      setError(t("pleaseEnterUsernameAndPassword") || "Please enter username and password");
      return;
    }

    try {
      await login(formData.username, formData.password);
    } catch (err: any) {
      setError(err.message || t("loginFailed") || "Login failed");
    }
  };

  return (
    <>
      <Head>
        <title>
          {t("login")} | {t("climateInformationSystem")}
        </title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Login Form */}
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      {locale === "en" ? "English" : "Kinyarwanda"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => changeLanguage("en")}>English</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage("rw")}>Kinyarwanda</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center">
                    <Image src="/ganzafrica.png" alt="GanzAfrica logo" width={140} height={140} />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("climateInformationSystem")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">{t("username")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="username" name="username" type="text" placeholder={t("enterUsername") || "Enter your username"} value={formData.username} onChange={handleInputChange} className="pl-10" disabled={isLoading} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder={t("enterPassword") || "Enter your password"} value={formData.password} onChange={handleInputChange} className="pl-10 pr-10" disabled={isLoading} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" disabled={isLoading}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("signingIn") || "Signing in..."}
                    </>
                  ) : (
                    t("signIn") || "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("dontHaveAccount") || "Don't have an account?"}{" "}
                  <Link href="/register" className="text-[#0c5b2f] hover:underline font-medium">
                    {t("signUp") || "Sign up"}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">© 2025 GanzAfrica. {t("allRightsReserved")}</div>
        </div>
      </div>
    </>
  );
};

export default Login;
