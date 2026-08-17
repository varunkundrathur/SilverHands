import React from "react";
import {
  Sparkles,
  Volume2,
  MapPin,
  User as UserIcon,
  Layers,
  Code2,
  LogOut,
  RotateCcw,
  Type,
  Sun,
  Moon,
  Store,
  Compass,
  Smartphone,
  Monitor,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { User } from "../types";

interface NavbarProps {
  currentUser: User | null;
  activePortal: "provider" | "customer";
  onSwitchPortal: (portal: "provider" | "customer") => void;
  deviceViewMode: "web" | "mobile";
  onToggleDeviceView: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onResetData: () => void;
  onOpenFlutterCode: () => void;
  largeTextMode: boolean;
  onToggleLargeText: () => void;
  onOpenMeetupModal?: () => void;
  eventsCount?: number;
  onOpenMessages?: () => void;
  unreadMessagesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activePortal,
  onSwitchPortal,
  deviceViewMode,
  onToggleDeviceView,
  onOpenAuth,
  onLogout,
  onResetData,
  onOpenFlutterCode,
  largeTextMode,
  onToggleLargeText,
  onOpenMeetupModal,
  eventsCount = 0,
  onOpenMessages,
  unreadMessagesCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-amber-900/30 text-amber-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 border border-amber-300/40">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold tracking-tight text-amber-100 font-serif">
                  SilverHands
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Firebase Live</span>
                </span>
              </div>
              <p className="text-xs text-amber-200/70 hidden sm:block">
                Bridging Senior Artisans & Neighborhood Buyers
              </p>
            </div>
          </div>

          {/* Portal Switcher (Big accessible pills) */}
          <div className="hidden md:flex items-center bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
            <button
              id="portal-customer-btn"
              onClick={() => onSwitchPortal("customer")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-base font-semibold transition-all ${
                activePortal === "customer"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span>Neighbor Feed</span>
            </button>

            <button
              id="portal-provider-btn"
              onClick={() => onSwitchPortal("provider")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-base font-semibold transition-all ${
                activePortal === "provider"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Store className="w-5 h-5" />
              <span>Artisan Portal</span>
            </button>

            {onOpenMeetupModal && (
              <button
                id="portal-meetups-btn"
                onClick={onOpenMeetupModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-base font-semibold text-amber-300 hover:text-white hover:bg-amber-500/20 transition-all cursor-pointer border border-amber-500/30 ml-1"
                title="Community Flea Markets, Meetups & Bazaars"
              >
                <span>🎪</span>
                <span>Meetups & Bazaars</span>
                {eventsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                    {eventsCount}
                  </span>
                )}
              </button>
            )}

            {onOpenMessages && (
              <button
                id="portal-messages-btn"
                onClick={onOpenMessages}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-base font-semibold text-amber-300 hover:text-white hover:bg-amber-500/20 transition-all cursor-pointer border border-amber-500/30 ml-1"
                title="View Artisan & Client Messages"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>{currentUser?.role === "provider" ? "Client Inquiries" : "Messages"}</span>
                {unreadMessagesCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold animate-pulse">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Utilities & User Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* View Switcher: Mobile App Frame vs Web Responsive View */}
            <button
              id="toggle-device-view-btn"
              onClick={onToggleDeviceView}
              title={
                deviceViewMode === "mobile"
                  ? "Switch to Responsive Desktop View"
                  : "Switch to Native Mobile App Simulation Shell"
              }
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md"
            >
              {deviceViewMode === "mobile" ? (
                <>
                  <Monitor className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Web View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Mobile App View</span>
                </>
              )}
            </button>

            {/* Accessibility: Font Size Scaler */}
            <button
              id="font-scale-btn"
              onClick={onToggleLargeText}
              title="Toggle Large Senior-Friendly Typography"
              className={`p-2.5 rounded-lg border transition-colors flex items-center space-x-1 ${
                largeTextMode
                  ? "bg-amber-500 text-slate-950 border-amber-300 font-bold"
                  : "bg-slate-800 text-amber-200 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Type className="w-5 h-5" />
              <span className="text-xs font-bold">{largeTextMode ? "22px" : "18px"}</span>
            </button>

            {/* Flutter Code & Architecture Viewer */}
            <button
              id="flutter-code-btn"
              onClick={onOpenFlutterCode}
              title="View & Export Flutter Dart Code for VS Code"
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 text-sm font-medium transition-colors"
            >
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Flutter Dart Specs</span>
            </button>

            {/* User Profile / Auth */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-slate-800/80 pl-2.5 pr-1.5 py-1.5 rounded-xl border border-slate-700">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400/50 bg-amber-700 flex items-center justify-center text-xs font-bold">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{currentUser.fullName.charAt(0)}</span>
                  )}
                </div>
                <div className="hidden xl:block text-left pr-2">
                  <div className="text-xs font-bold text-amber-100 leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-amber-300/80 capitalize">
                    {currentUser.role === "provider" ? "Senior Artisan" : "Neighbor Buyer"}
                  </div>
                </div>
                <button
                  id="auth-logout-btn"
                  onClick={onLogout}
                  title="Log out / Switch User"
                  className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="auth-login-btn"
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
