// app/register/page.tsx
"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterForm() {
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    jabatan: "",
    unit: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validasi password match
    if (formData.password !== formData.confirm_password) {
      setError("Password dan konfirmasi password tidak sama");
      setIsSubmitting(false);
      return;
    }

    try {
      await register(formData);
      // Redirect sudah dihandle di AuthContext
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Registrasi gagal. Silakan coba lagi.");
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
    
    if (error) setError("");
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 border-l-6 border-sky-500 font-semibold text-gray-800 text-md dark:text-white/90 sm:text-title-md">
              &nbsp; Create Account
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fill in your details to create an account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="username">
                  Username <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoading}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoading}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isSubmitting || isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm_password">
                  Confirm Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    disabled={isSubmitting || isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="jabatan">Jabatan (Optional)</Label>
                <Input
                  id="jabatan"
                  name="jabatan"
                  placeholder="Enter your position"
                  value={formData.jabatan}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoading}
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit (Optional)</Label>
                <Input
                  id="unit"
                  name="unit"
                  placeholder="Enter your unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  disabled={isSubmitting || isLoading}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>
              </div>

              <div className="pt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}