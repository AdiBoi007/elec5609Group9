import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, Bell, Brain, CirclePlus, Dumbbell, LayoutDashboard, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, Sun, Target, UserRound, X } from "lucide-react";
import { useAuth } from "../context/auth";
import { useTheme } from "../context/theme";
import { api } from "../services/api";
import { isProfileComplete, type AppNotification, type UserProfile } from "../types";
import { CommandPalette } from "./CommandPalette";
import { QuickLogDrawer } from "./QuickLogDrawer";
import { OnboardingModal } from "./OnboardingModal";
import { BrandLogo } from "./BrandLogo";

const ONBOARDING_DISMISSED_KEY = "pulse_onboarding_dismissed";

const navGroups = [
  { label: "Today", items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }] },
  { label: "Log", items: [{ label: "Log", to: "/log", icon: CirclePlus }] },
  { label: "Progress", items: [{ label: "Progress", to: "/progress", icon: BarChart3 }, { label: "Goals", to: "/goals", icon: Target }] },
  { label: "Plan", items: [{ label: "Plans", to: "/plans", icon: Dumbbell }] },
  { label: "Circle AI", items: [{ label: "Ask Circle", to: "/insights", icon: Brain }] },
  { label: "Account", items: [{ label: "Settings", to: "/settings", icon: Settings }] },
];

function Sidebar({ open, collapsed, onClose, onToggle }: { open: boolean; collapsed: boolean; onClose: () => void; onToggle: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || "User").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return <>
    {open && <button type="button" aria-label="Close menu" onClick={onClose} className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-line bg-surface-muted py-4 transition-[width,transform] duration-300 ${collapsed ? "lg:w-[76px]" : "lg:w-[232px]"} ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className={`mb-5 flex h-11 items-center px-4 ${collapsed ? "lg:justify-center" : "justify-between"}`}>
        <NavLink to="/dashboard" onClick={onClose} className="flex min-w-0 items-center text-xl text-ink" title="Circle Health"><BrandLogo markClassName="size-10 shrink-0" nameClassName={collapsed ? "lg:hidden" : ""}/></NavLink>
        <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-black/5 lg:hidden" aria-label="Close navigation"><X size={18}/></button>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3">{navGroups.map(group => <div key={group.label}>
        <p className={`mb-1 px-2 text-[9px] font-bold uppercase tracking-[.14em] text-muted/65 ${collapsed ? "lg:h-2 lg:overflow-hidden lg:text-transparent" : ""}`}>{group.label}</p>
        <div className="space-y-0.5">{group.items.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} aria-label={label} data-tooltip={collapsed ? label : undefined} className={({ isActive }) => `group flex h-10 items-center rounded-xl text-[13px] font-semibold transition ${collapsed ? "lg:justify-center lg:px-0" : "gap-3 px-3"} ${isActive ? "bg-ink text-white shadow-sm ring-1 ring-black/10" : "text-muted hover:bg-surface-elevated hover:text-ink"}`}><Icon size={17} strokeWidth={2.15}/><span className={collapsed ? "lg:hidden" : ""}>{label}</span></NavLink>)}</div>
      </div>)}</nav>
      <div className="mt-4 border-t border-black/[0.06] px-3 pt-3">
        <button type="button" onClick={() => navigate("/settings")} title={collapsed ? user?.name : undefined} className={`flex w-full items-center rounded-xl p-2 text-left transition hover:bg-black/[0.04] ${collapsed ? "lg:justify-center" : "gap-3"}`}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e9ffef] text-xs font-bold text-[#218c49]">{initials}</span><span className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}><span className="block truncate text-xs font-semibold text-ink">{user?.name || "Adhiraj Dogra"}</span><span className="block text-[10px] text-muted">View profile</span></span></button>
        <button type="button" onClick={() => { void logout().then(() => navigate("/login")); }} title="Sign out" className={`mt-1 flex h-9 w-full items-center rounded-xl text-xs font-semibold text-muted hover:bg-black/[0.04] hover:text-ink ${collapsed ? "lg:justify-center" : "gap-3 px-3"}`}><LogOut size={15}/><span className={collapsed ? "lg:hidden" : ""}>Sign out</span></button>
        <button type="button" onClick={onToggle} className="mt-2 hidden h-9 w-full items-center justify-center gap-2 rounded-xl border border-black/[0.06] text-xs font-semibold text-muted transition hover:bg-black/[0.03] hover:text-ink lg:flex" title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={16}/> : <><PanelLeftClose size={16}/><span>Collapse</span></>}</button>
      </div>
    </aside>
  </>;
}

export function AppShell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolved, setMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("pulse_sidebar_collapsed") === "true");
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [onboardingProfile, setOnboardingProfile] = useState<UserProfile | null>(null);
  const loadNotifications = () => api.getNotifications().then(result => { setNotifications(result.notifications); setUnread(result.unreadCount); setNotificationError(""); }).catch(reason => setNotificationError(reason instanceof Error ? reason.message : "Unable to load notifications"));
  useEffect(() => { void loadNotifications(); }, []);
  useEffect(() => { if (sessionStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true") return; void api.getProfile().then(profile => { if (!isProfileComplete(profile)) setOnboardingProfile(profile); }).catch(() => undefined); }, []);
  const dismissOnboarding = () => { sessionStorage.setItem(ONBOARDING_DISMISSED_KEY, "true"); setOnboardingProfile(null); };
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); }, []);
  const toggleCollapsed = () => setCollapsed(current => { localStorage.setItem("pulse_sidebar_collapsed", String(!current)); return !current; });
  return <div className="min-h-screen bg-canvas text-ink">
    <Sidebar open={menuOpen} collapsed={collapsed} onClose={() => setMenuOpen(false)} onToggle={toggleCollapsed}/>
    <div className={`transition-[padding] duration-300 ${collapsed ? "lg:pl-[76px]" : "lg:pl-[232px]"}`}>
      <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-xl md:px-6 lg:px-8">
        <button type="button" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-full bg-surface shadow-sm lg:hidden" aria-label="Open menu"><Menu size={19}/></button>
        <button type="button" onClick={() => setSearchOpen(true)} className="flex h-10 min-w-0 max-w-[420px] flex-1 items-center gap-3 rounded-full border border-line bg-surface px-4 text-left text-sm text-muted shadow-sm transition hover:border-coral/25"><Search size={16}/><span className="truncate">Ask or log anything</span><span className="ml-auto hidden rounded-md bg-surface-muted px-2 py-1 text-[9px] font-bold sm:block">⌘ K</span></button>
        <div className="ml-auto flex items-center gap-2"><button type="button" role="switch" aria-checked={resolved === "dark"} aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`} title={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`} onClick={() => setMode(resolved === "dark" ? "light" : "dark")} className="relative h-10 w-16 shrink-0 rounded-full border border-line bg-surface shadow-sm transition-colors duration-200"><Sun aria-hidden="true" size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-amber"/><Moon aria-hidden="true" size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-violet"/><span className={`absolute left-[5px] top-[5px] grid size-7 place-items-center rounded-full bg-ink text-white shadow-sm transition-transform duration-200 ${resolved === "dark" ? "translate-x-6" : "translate-x-0"}`}>{resolved === "dark" ? <Moon size={13}/> : <Sun size={13}/>}</span></button><button type="button" onClick={() => { setNotificationsOpen(current => !current); if (!notificationsOpen) void loadNotifications(); }} className="relative grid size-10 place-items-center rounded-full bg-white shadow-sm transition hover:-translate-y-0.5" aria-label="Notifications"><Bell size={17}/>{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full border-2 border-white bg-coral px-1 text-[9px] font-bold text-white">{unread}</span>}</button><button type="button" onClick={() => navigate("/settings")} className="hidden size-10 place-items-center rounded-full bg-white shadow-sm sm:grid" aria-label="Open profile" title={user?.name}><UserRound size={17}/></button><button type="button" onClick={() => setQuickLogOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5"><CirclePlus size={17}/><span className="hidden sm:inline">Quick Log</span><span className="sm:hidden">Log</span></button></div>
      </header>
      {notificationsOpen && <div className="fixed right-4 top-[72px] z-30 w-[min(360px,calc(100vw-32px))] rounded-[22px] border border-line bg-surface p-4 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold">Notifications</h3><p className="text-[11px] text-muted">{unread} unread</p></div>{unread > 0 && <button type="button" onClick={async () => { setNotificationError(""); try { const result = await api.readAllNotifications(); setNotifications(result.notifications); setUnread(0); } catch (reason) { setNotificationError(reason instanceof Error ? reason.message : "Unable to update notifications"); } }} className="ml-auto mr-3 text-[11px] font-bold">Mark all read</button>}<button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={16}/></button></div>{notificationError && <p className="mt-3 rounded-xl bg-[#fff1ef] p-3 text-xs font-semibold text-coral">{notificationError}</p>}<div className="mt-3 max-h-[360px] divide-y divide-line overflow-y-auto">{notifications.map(item => <button key={item.id} type="button" onClick={async () => { if (!item.read) { try { const updated = await api.readNotification(item.id); setNotifications(current => current.map(value => value.id === item.id ? updated : value)); setUnread(current => Math.max(0, current - 1)); } catch (reason) { setNotificationError(reason instanceof Error ? reason.message : "Unable to update notification"); } } }} className="w-full py-3 text-left"><div className="flex items-center gap-2"><p className="text-xs font-bold">{item.title}</p>{!item.read && <span className="size-2 rounded-full bg-coral"/>}</div><p className="mt-1 text-xs leading-5 text-muted">{item.message}</p></button>)}{!notifications.length && !notificationError && <p className="py-8 text-center text-sm text-muted">You’re all caught up.</p>}</div></div>}
      <main className="mx-auto max-w-[1480px] px-4 py-5 md:px-6 md:py-7 lg:px-8"><Outlet/></main>
    </div>
    <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)}/>
    <QuickLogDrawer open={quickLogOpen} onClose={() => setQuickLogOpen(false)}/>
    {onboardingProfile && <OnboardingModal profile={onboardingProfile} onComplete={dismissOnboarding} onSkip={dismissOnboarding}/>}
  </div>;
}
