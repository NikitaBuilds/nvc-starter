import { useSession, signIn, signOut } from "next-auth/react";
import { Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const Header = () => {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // Navigation items array
  const navigationItems = [{ name: "Analysis", href: "/" }];

  // Get user initials from name or email
  const getUserInitials = () => {
    if (session?.user?.name) {
      return session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email[0].toUpperCase();
    }
    return "?";
  };

  return (
    <header className=" shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0 flex items-center w-36">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
            >
              NVC+
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex sm:space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  router.pathname === item.href
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-gray-900 hover:text-gray-600"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="hidden sm:flex items-center space-x-4 w-32">
            {status === "loading" ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            ) : session ? (
              <div className="flex items-center space-x-4">
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitials()}
                  </div>
                )}
                <button
                  onClick={() => signOut()}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 
                    transition-colors cursor-pointer px-3 py-2 rounded-md hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")} // Changed this line
                className="inline-flex items-center px-4 py-2 border border-transparent 
    text-sm font-medium rounded-md text-white  hover:bg-gray-600
    transition-colors cursor-pointer focus:outline-none focus:ring-2 
    focus:ring-offset-2 focus:ring-blue-500 bg-gray-800"
              >
                Sign in
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden inline-flex items-center justify-center p-2 rounded-md 
              text-gray-900 hover:text-gray-600 hover:bg-gray-100 transition-colors
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            aria-expanded={isMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden pb-3">
            <div className="pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium 
                    transition-colors ${
                      router.pathname === item.href
                        ? "text-blue-600 hover:text-blue-700 bg-blue-50"
                        : "text-gray-900 hover:text-gray-600 hover:bg-gray-50"
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              {status === "loading" ? (
                <div className="mx-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                </div>
              ) : session ? (
                <div className="flex items-center px-3">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                      {getUserInitials()}
                    </div>
                  )}
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {session.user?.name || session.user?.email}
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setIsMenuOpen(false);
                      }}
                      className="mt-1 text-sm font-medium text-gray-600 hover:text-gray-900 
                        transition-colors cursor-pointer px-3 py-2 rounded-md hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-3">
                  <button
                    onClick={() => {
                      signIn("google"); // Changed this line
                      setIsMenuOpen(false);
                    }}
                    className="w-full inline-flex justify-center items-center px-4 py-2 
    border border-transparent text-sm font-medium rounded-md text-white 
    bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
