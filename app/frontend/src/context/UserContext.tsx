import { createContext, useContext } from 'react';
import { z } from 'zod';

// Schema for user details validation
export const userDetailsSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  firstNamePronunciation: z.string().optional(),
  email:    z.string().email("Enter a valid email address."),
  onboardingComplete: z.boolean().optional()
});

// Type derived from the schema
export type UserDetails = z.infer<typeof userDetailsSchema>;

// The React Context for sharing user details
export const UserContext = createContext<UserDetails | null>(null);

/**
 * Custom hook to access the UserContext.
 * This is safe to use as consumers will handle the null case.
 */
export const useUser = () => useContext(UserContext); 