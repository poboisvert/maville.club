"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getLandingPages,
  deleteLandingPage,
  type LandingPageRow,
} from "@/lib/landing-pages";
import { getCurrentUser, signOut } from "@/lib/auth";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLandingPagesPage() {
  const [pages, setPages] = useState<LandingPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push("/app");
      return;
    }
    setUser(currentUser);
    loadPages();
  }

  async function loadPages() {
    try {
      setLoading(true);
      const data = await getLandingPages(false);
      setPages(data);
    } catch (error) {
      console.error("Error loading pages:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this landing page?")) {
      return;
    }

    try {
      await deleteLandingPage(id);
      loadPages();
    } catch (error) {
      console.error("Error deleting page:", error);
      alert("Failed to delete page");
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Landing Pages Admin</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your landing pages
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/admin/lp/new">
              <Plus className="mr-2 h-4 w-4" />
              New Page
            </Link>
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {pages.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No landing pages yet
            </p>
            <Button asChild>
              <Link href="/admin/lp/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Page
              </Link>
            </Button>
          </div>
        ) : (
          pages.map((page) => (
            <div
              key={page.id}
              className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:border-brand-blue transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">{page.title}</h2>
                    {page.published ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                        <Eye className="h-4 w-4" />
                        Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 text-sm">
                        <EyeOff className="h-4 w-4" />
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    /lp/{page.slug}
                  </p>
                  {page.subtitle && (
                    <p className="text-slate-700 dark:text-slate-300">
                      {page.subtitle}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 mt-2">
                    Updated: {new Date(page.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/lp/${page.slug}`} target="_blank">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/lp/${page.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(page.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

