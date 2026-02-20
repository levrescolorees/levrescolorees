import {
  LayoutDashboard, Package, FolderOpen, ShoppingCart,
  Users, Tag, Settings, Image, LogOut, Plug
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Produtos', url: '/admin/produtos', icon: Package },
  { title: 'Coleções', url: '/admin/colecoes', icon: FolderOpen },
  { title: 'Pedidos', url: '/admin/pedidos', icon: ShoppingCart },
  { title: 'Clientes', url: '/admin/clientes', icon: Users },
  { title: 'Cupons', url: '/admin/cupons', icon: Tag },
  { title: 'Mídia', url: '/admin/midia', icon: Image },
  { title: 'Integrações', url: '/admin/integracoes', icon: Plug },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
];

export function AdminSidebar() {
  const { signOut, user } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <h2 className="font-display text-lg font-bold text-sidebar-foreground">Lèvres Colorées</h2>
        <p className="text-xs font-body text-muted-foreground">Admin</p>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-body text-xs">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md font-body text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="text-xs font-body text-muted-foreground truncate mb-2">
          {user?.email}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
