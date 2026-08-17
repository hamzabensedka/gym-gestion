import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe requis"),
});

export const memberSchema = z.object({
  fullName: z.string().min(2, "Nom requis"),
  phone: z.string().min(8, "Téléphone requis"),
  email: z
    .string()
    .email("Email invalide")
    .optional()
    .or(z.literal("")),
  subscriptionStart: z.string().min(1, "Date de début requise"),
  subscriptionEnd: z.string().min(1, "Date de fin requise"),
  notes: z.string().optional(),
  monthlyFee: z.coerce.number().min(0, "Montant invalide"),
  badgeNumber: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"], { message: "Sexe requis" }),
});

export const memberInviteSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const memberSetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Mot de passe trop court"),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export const memberLoginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type MemberFormInput = z.infer<typeof memberSchema>;

export const staffSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
  role: z.enum(["ADMIN", "STAFF"]),
});

export const gymSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  location: z.string().optional(),
  cardTheme: z.enum(["default", "fitbox-mahdia"]).optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Mot de passe trop court"),
});

export const freezeMemberSchema = z.object({
  until: z.string().optional(),
});

export const paymentMethods = ["CASH", "D17", "BANK_TRANSFER", "CARD", "OTHER"] as const;

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Montant invalide"),
  method: z.enum(paymentMethods),
  paidAt: z.string().min(1, "Date requise"),
  note: z.string().optional(),
});

export type PaymentFormInput = z.infer<typeof paymentSchema>;
