"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useRouter } from "next/navigation"; // Import useRouter

export default function SignInForm() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validasi sederhana
    if (!formData.username.trim()) {
      setError("Username atau email harus diisi");
      setIsSubmitting(false);
      return;
    }

    if (!formData.password.trim()) {
      setError("Password harus diisi");
      setIsSubmitting(false);
      return;
    }

    try {
      await login({
        username: formData.username,
        password: formData.password,
      });
      // Redirect sudah dihandle di AuthContext
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login gagal. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) setError("");
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        {/* Anda bisa menambahkan back button di sini jika diperlukan */}
        {/* <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to home
        </Link> */}
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 border-l-6 border-sky-500 font-semibold text-gray-800 text-md dark:text-white/90 sm:text-title-md">
              &nbsp; Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your username and password to sign in!
            </p>
          </div>

          <div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {isLoading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-600">Memuat data...</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <Label htmlFor="username">
                    Username <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="Enter your username or email"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isSubmitting || isLoading}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Bisa menggunakan username atau email
                  </p>
                </div>

                <div>
                  <Label htmlFor="password">
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      disabled={isSubmitting || isLoading}
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Checkbox
                      id="remember-me"
                      checked={isChecked}
                      onChange={(e:any) => setIsChecked(e.target.checked)}
                      disabled={isSubmitting || isLoading}
                    />
                    <Label
                      htmlFor="remember-me"
                      className="ml-2 text-sm text-gray-600 cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>

                  <Link
                    href="/forgot-password"
                    className="text-sm text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed"
                    size="sm"
                    disabled={isSubmitting || isLoading}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="w-5 h-5 mr-2 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200">
                  <p className="text-sm text-center text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/signup"
                      className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}