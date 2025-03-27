import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  BarChart,
  Layers,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function SidebarNav() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Templates", href: "/templates", icon: FileText },
    { name: "Sectors", href: "/sectors", icon: Layers },
    { name: "Analytics", href: "/analytics", icon: BarChart },
  ];

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center">
        <h2 className="text-lg font-semibold">Newsletter Generator</h2>
      </div>

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link href={item.href}>
                    <button
                      onClick={() => isMobile && setOpen(false)}
                      className={cn(
                        "group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6",
                        location === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      {item.name}
                    </button>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>

      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  // Mobile view with sheet
  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-background border-b p-4">
        <h2 className="text-lg font-semibold">Newsletter Generator</h2>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col gap-y-5 bg-muted/40 px-6 py-4">
              <NavContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="flex h-screen flex-col gap-y-5 bg-muted/40 border-r px-6 py-4 w-64">
      <NavContent />
    </div>
  );
}