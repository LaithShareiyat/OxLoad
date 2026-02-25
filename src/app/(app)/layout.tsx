import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { QuickAddDialog } from "@/components/quick-add/quick-add-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userInfo = {
    email: "laith.shareiyat@ox.ac.uk",
    full_name: "Laith Shareiyat" as string | undefined,
  };

  if (!isMock) {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    userInfo = {
      email: user.email || "",
      full_name: profile?.full_name || undefined,
    };
  }

  return (
    <SidebarProvider>
      <AppSidebar user={userInfo} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
      <QuickAddDialog />
    </SidebarProvider>
  );
}
