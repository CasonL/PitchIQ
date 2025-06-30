/**
 * UserDetailsGate.tsx  (React 18 / TSX)
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";

/* ---------- types & context ---------- */

const schema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  firstNamePronunciation: z.string().optional(),
  email:    z.string().email("Enter a valid email address.")
});
type FormShape = z.infer<typeof schema>;

const UserCtx = createContext<FormShape | null>(null);
export const useUser = () => useContext(UserCtx)!;

/* ---------- gate component ---------- */

interface Props {
  children: React.ReactNode;
}

const STORAGE_KEY = "pitchiq:user";

const UserDetailsGate: React.FC<Props> = ({ children }) => {
  const [cached, setCached] = useState<FormShape | null>(null);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormShape>({ resolver: zodResolver(schema) });

  /* try localStorage once on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCached(JSON.parse(raw));
    } catch (_) {/* ignore */}
  }, []);

  const onSubmit = (data: FormShape) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (_) {/* fallback – session only */}
    setCached(data);
  };

  /* if we have data, render children with context */
  if (cached) {
    return <UserCtx.Provider value={cached}>{children}</UserCtx.Provider>;
  }

  /* -------------- form -------------- */
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome to the Pitch IQ Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <Input
                  id="fullName"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="firstNamePronunciation" className="block text-sm font-medium text-gray-700">
                  First name pronunciation <span className="text-gray-500">(Optional)</span>
                </label>
                <Input
                  id="firstNamePronunciation"
                  placeholder="e.g., SHAWN (for Sean)"
                  {...register("firstNamePronunciation")}
                />
                <p className="mt-1 text-xs text-gray-500">Help the AI pronounce your first name correctly</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Work email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@acme.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Button outside and below the card */}
        <div className="mt-4 flex justify-center">
          <Button 
            onClick={handleSubmit(onSubmit)} 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsGate; 