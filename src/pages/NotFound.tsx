import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Mascot } from "@/components/Mascot";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center px-6">
        <Mascot variant="sad" size={120} className="mx-auto mb-6" />
        <h1 className="mb-2 text-3xl font-heading-en font-bold text-foreground">This page doesn't exist</h1>
        <p className="mb-6 text-base text-muted-foreground">Looks like you took a wrong turn.</p>
        <Link
          to="/dashboard"
          className="inline-block bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Go Home →
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
