import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug logs
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin", // Points to pages/auth/signin.tsx
    // error: '/auth/error',   // Points to pages/auth/error.tsx
    // signOut: '/auth/signout' // Points to pages/auth/signout.tsx
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      console.log("JWT Callback:", { token, account, profile });
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback:", { session, token });
      return session;
    },
  },
};

console.log("Environment check:", {
  hasClientId: !!process.env.GOOGLE_CLIENT_ID,
  hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
});

export default NextAuth(authOptions);
