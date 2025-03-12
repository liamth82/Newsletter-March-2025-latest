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
} from "lucide-react";

export function SidebarNav() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Templates", href: "/templates", icon: FileText },
    { name: "Sectors", href: "/sectors", icon: Layers },
    { name: "Analytics", href: "/analytics", icon: BarChart },
  ];

  return (
    <div className="flex h-screen flex-col gap-y-5 bg-muted/40 border-r px-6 py-4 w-64">
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
                    <a
                      className={cn(
                        "group flex gap-x-3 rounded-md p-2 text-sm leading-6",
                        location === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      {item.name}
                    </a>
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
    </div>
  );
}