import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Mic,
  MapPin,
  Sparkles,
  Filter,
  Layers,
  Map as MapIcon,
  Grid,
  Volume2,
  Repeat,
  GraduationCap,
  RotateCcw,
  Loader2,
  CheckCircle,
  Compass,
  Radio,
  ChevronRight,
  MessageSquare,
  Phone,
  ArrowRight,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Listing, ListingCategory, GeoLocation, CustomerSearchIntent, MarketplaceEvent, User, Conversation } from "../types";
import { filterListingsByProximity, formatDistance } from "../services/locationService";
import { parseCustomerSearchIntent, detectLanguageWithAI } from "../services/geminiService";
import { startVoiceRecognition, SUPPORTED_SPEECH_LANGUAGES, detectLanguageFromText } from "../services/audioService";
import { getConversationsForUser, subscribeToMessages, getUnreadMessageCount } from "../services/storageService";
import { ListingCard } from "./ListingCard";
import { InteractiveMap } from "./InteractiveMap";
import { ClientMessagesPanel } from "./ClientMessagesPanel";

interface CustomerHomeProps {
  listings: Listing[];
  userLocation: GeoLocation;
  onContactProvider: (listing: Listing) => void;
  onEditListing?: (listing: Listing) => void;
  currentUserId?: string;
  currentUser?: User | null;
  largeTextMode?: boolean;
  onUpdateUserLocation?: (loc: GeoLocation) => void;
  events?: MarketplaceEvent[];
  onOpenMeetupModal?: () => void;
  onSelectEvent?: (event: MarketplaceEvent) => void;
  onOpenMessages?: () => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  listings,
  userLocation,
  onContactProvider,
  onEditListing,
  currentUserId,
  currentUser,
  largeTextMode = false,
  onUpdateUserLocation,
  events = [],
  onOpenMeetupModal,
  onSelectEvent,
  onOpenMessages,
}) => {
  const [feedTab, setFeedTab] = useState<"craft_feed" | "artisan_messages">("craft_feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [barterOnly, setBarterOnly] = useState<boolean>(false);
  const [apprenticeOnly, setApprenticeOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"split" | "feed" | "map">("split");
  const [selectedListingForMap, setSelectedListingForMap] = useState<Listing | null>(null);

  // Conversations & Provider Replies State
  const effectiveUserId = currentUser?.id || currentUserId || "user_customer_priya";
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    getConversationsForUser(effectiveUserId)
  );
  const [unreadCount, setUnreadCount] = useState<number>(() =>
    getUnreadMessageCount(effectiveUserId)
  );

  // Multilingual Speech Recognition State
  const [speechLanguage, setSpeechLanguage] = useState<string>("auto");
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [aiIntentResult, setAiIntentResult] = useState<CustomerSearchIntent | null>(null);
  const [speechRecognizer, setSpeechRecognizer] = useState<any>(null);
  const [autoDetectedLangNotice, setAutoDetectedLangNotice] = useState<string | null>(null);

  // Subscribe to live messages so incoming provider replies immediately update the feed panel
  useEffect(() => {
    const updateConversations = () => {
      const convs = getConversationsForUser(effectiveUserId);
      setConversations(convs);
      setUnreadCount(getUnreadMessageCount(effectiveUserId));
    };

    updateConversations();
    const unsubscribe = subscribeToMessages(() => {
      updateConversations();
    });

    return () => {
      unsubscribe();
    };
  }, [effectiveUserId]);

  const effectiveUser: User = currentUser || {
    id: "user_customer_priya",
    fullName: "Priya Sharma",
    phone: "+1 (555) 912-3344",
    role: "customer",
    preferredLanguage: "English",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    location: {
      lat: userLocation.lat || 13.0827,
      lng: userLocation.lng || 80.2707,
      address: "Flat 4B, Lotus Apartments, 1st Cross Rd",
      neighborhood: "Heritage Quarter / T. Nagar",
      city: "Metro West",
    },
  };

  // Filter listings by proximity first (Haversine formula), then apply intent/keywords
  const proximityFiltered = useMemo(() => {
    return filterListingsByProximity(listings, userLocation, radiusKm);
  }, [listings, userLocation, radiusKm]);

  const finalFilteredListings = useMemo(() => {
    return proximityFiltered.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Barter toggle
      if (barterOnly && !item.isBarter) {
        return false;
      }

      // Apprentice toggle
      if (apprenticeOnly && !item.digitalApprenticeEligible) {
        return false;
      }

      // Keyword / Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (item.title + " " + (item.titleEnglish || "")).toLowerCase().includes(q);
        const matchesDesc = (item.description + " " + (item.descriptionEnglish || "")).toLowerCase().includes(q);
        const matchesProvider = item.providerName.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchesHeritage = (item.heritageNotes || "").toLowerCase().includes(q);

        if (!matchesTitle && !matchesDesc && !matchesProvider && !matchesTags && !matchesHeritage) {
          return false;
        }
      }

      // AI Intent match if parsed
      if (aiIntentResult?.keywords && aiIntentResult.keywords.length > 0) {
        const fullContent = (
          item.title +
          " " +
          (item.titleEnglish || "") +
          " " +
          item.description +
          " " +
          item.tags.join(" ")
        ).toLowerCase();

        const matchCount = aiIntentResult.keywords.filter((kw) =>
          fullContent.includes(kw.toLowerCase())
        ).length;

        // If keywords were extracted by Gemini, prioritize matching items
        if (matchCount === 0 && searchQuery.length > 0) {
          return false;
        }
      }

      return true;
    });
  }, [proximityFiltered, selectedCategory, barterOnly, apprenticeOnly, searchQuery, aiIntentResult]);

  // Handle AI Search Intent
  const handleAISearch = async (queryText: string) => {
    if (!queryText.trim()) return;

    // Check language of typed/spoken query and auto-switch if needed
    const detected = detectLanguageFromText(queryText);
    if (detected && detected.code !== speechLanguage) {
      setSpeechLanguage(detected.code);
      setAutoDetectedLangNotice(`✨ Spoken in ${detected.name} (${detected.nativeName}) — automatically switched to ${detected.name}!`);
      setTimeout(() => setAutoDetectedLangNotice(null), 5000);
    }

    setIsParsingAI(true);
    try {
      const intent = await parseCustomerSearchIntent(queryText);
      setAiIntentResult(intent);

      if (intent.category && intent.category !== "all") {
        setSelectedCategory(intent.category);
      }
      if (intent.isBarter) {
        setBarterOnly(true);
      }
      if (intent.requiresApprentice) {
        setApprenticeOnly(true);
      }
      if (intent.maxDistanceKm && intent.maxDistanceKm > 0) {
        setRadiusKm(intent.maxDistanceKm);
      }
    } catch (e) {
      console.error("AI Search intent parsing failed", e);
    } finally {
      setIsParsingAI(false);
    }
  };

  const handleVoiceSearchToggle = () => {
    if (isVoiceListening) {
      if (speechRecognizer) {
        speechRecognizer.stop();
        setSpeechRecognizer(null);
      }
      setIsVoiceListening(false);
    } else {
      setIsVoiceListening(true);
      setAutoDetectedLangNotice(null);

      const recognizer = startVoiceRecognition(
        (transcript) => {
          setSearchQuery(transcript);
          // Check language immediately
          const det = detectLanguageFromText(transcript);
          if (det) {
            setSpeechLanguage(det.code);
            setAutoDetectedLangNotice(`✨ Spoken in ${det.name} (${det.nativeName}) — automatically switched!`);
            setTimeout(() => setAutoDetectedLangNotice(null), 5000);
          }
          handleAISearch(transcript);
          setIsVoiceListening(false);
        },
        (err) => {
          console.warn("Speech recognition notice:", err);
          setIsVoiceListening(false);
        },
        speechLanguage,
        (detected) => {
          // Dynamic real-time detection callback
          if (detected.code !== speechLanguage) {
            setSpeechLanguage(detected.code);
            setAutoDetectedLangNotice(`✨ Detected ${detected.name} (${detected.nativeName}) — automatically switched!`);
            setTimeout(() => setAutoDetectedLangNotice(null), 5000);
          }
        }
      );
      setSpeechRecognizer(recognizer);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setBarterOnly(false);
    setApprenticeOnly(false);
    setAiIntentResult(null);
    setRadiusKm(5);
  };

  const categoryTabs = [
    { id: "all", label: "All Crafts & Services" },
    { id: "repairs_mending", label: "🧵 Sari & Clothing Mending" },
    { id: "traditional_skills", label: "🕰️ Horology & Vintage Skills" },
    { id: "home_cooking", label: "🍲 Heirloom Food & Pickles" },
    { id: "gardening_botanicals", label: "🌿 Organic Herbs & Balms" },
    { id: "handmade_goods", label: "🪡 Handwoven Quilts & Crafts" },
    { id: "barter_request", label: "🤝 Neighbor Swaps & Requests" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-amber-50">
      {/* Primary Section Switcher: Neighbours Craft Feed vs Artisan Messages Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2 rounded-3xl border-2 border-amber-500/40 shadow-2xl">
        <div className="flex items-center space-x-2">
          <button
            id="feed-tab-crafts-btn"
            onClick={() => setFeedTab("craft_feed")}
            className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-sm sm:text-base transition-all cursor-pointer ${
              feedTab === "craft_feed"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/40"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>Neighbours Craft Feed</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                feedTab === "craft_feed"
                  ? "bg-slate-950 text-amber-300"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {listings.length}
            </span>
          </button>

          <button
            id="feed-tab-messages-btn"
            onClick={() => setFeedTab("artisan_messages")}
            className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-bold text-sm sm:text-base transition-all cursor-pointer relative ${
              feedTab === "artisan_messages"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/40"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Artisan Messages & Inquiries</span>
            {unreadCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs animate-pulse">
                {unreadCount} New
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  feedTab === "artisan_messages"
                    ? "bg-slate-950 text-amber-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {conversations.length}
              </span>
            )}
          </button>
        </div>

        {onOpenMeetupModal && events.length > 0 && (
          <button
            onClick={onOpenMeetupModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <span>🎪 Meetups & Bazaars ({events.length})</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        )}
      </div>

      {/* When Artisan Messages Tab is Selected: Render Dedicated Messages Panel Directly in Feed */}
      {feedTab === "artisan_messages" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/90 border border-amber-500/30 px-5 py-3.5 rounded-2xl text-xs sm:text-sm">
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="text-amber-400 font-bold">💬 Neighbours Communication Hub:</span>
              <span>Direct messages, estimates, and voice notes from senior service providers</span>
            </div>
            <button
              onClick={() => setFeedTab("craft_feed")}
              className="text-amber-300 hover:text-amber-200 font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>Back to Craft Feed</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <ClientMessagesPanel
            currentUser={effectiveUser}
            isEmbedded={true}
            largeTextMode={largeTextMode}
            onViewListing={(listingId) => {
              setFeedTab("craft_feed");
              const item = listings.find((l) => l.id === listingId);
              if (item) {
                setSelectedListingForMap(item);
                window.scrollTo({ top: 200, behavior: "smooth" });
              }
            }}
          />
        </div>
      ) : (
        /* Craft Feed Content */
        <>
          {/* Unread Provider Reply Notification Banner (If there are replies waiting) */}
          {unreadCount > 0 && conversations.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/70 border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
              <div className="flex items-center space-x-3.5">
                <div className="relative">
                  {conversations[0].providerAvatar ? (
                    <img
                      src={conversations[0].providerAvatar}
                      alt={conversations[0].providerName}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-900/50 border border-emerald-400 flex items-center justify-center text-emerald-300 font-bold text-lg">
                      {conversations[0].providerName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black uppercase tracking-wider">
                      Provider Reply Received
                    </span>
                    <span className="text-xs text-emerald-300 font-semibold">
                      {conversations[0].providerName} sent a reply
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-1 mt-0.5 italic">
                    {conversations[0].hasVoiceNote ? "🎙️ [Voice Note Audio Message] • " : ""}
                    "{conversations[0].lastMessage || "I can help with your restoration request!"}"
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center">
                <button
                  id="open-unread-reply-feed-btn"
                  onClick={() => setFeedTab("artisan_messages")}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center space-x-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all hover:scale-105"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>View Messages ({unreadCount} New)</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          )}

          {/* Live Neighborhood Activity & Radar Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-amber-500/30 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>Live Neighborhood Activity Feed</span>
                  </span>
                  <span className="text-slate-400 text-xs">• Real-time Sync Active</span>
                </div>
                <p className="text-xs text-slate-300">
                  Showing <span className="text-amber-300 font-bold">{listings.length} active neighbors</span> offering heritage crafts, repairs & skill swaps around you.
                </p>
              </div>
            </div>

            {/* Quick Click-to-Pin Neighbor Badges */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
              {listings.slice(0, 4).map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setSelectedListingForMap(l);
                    window.scrollTo({ top: 220, behavior: "smooth" });
                  }}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all shrink-0 cursor-pointer shadow-sm hover:border-amber-400"
                >
                  <img
                    src={l.providerAvatar || l.imageUrl}
                    alt={l.providerName}
                    className="w-5 h-5 rounded-full object-cover border border-amber-400/50"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-semibold">{l.providerName.split(" ")[0]}</span>
                  <span className="text-[10px] text-amber-300">({formatDistance(l.distanceKm)})</span>
                </button>
              ))}
            </div>
          </div>

      {/* Search & Multilingual Voice AI Bar */}
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Input */}
          <div className="relative flex-1">
            <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAISearch(searchQuery);
              }}
              placeholder='Search e.g. "Find someone who can fix my silk sari nearby" or in your native language...'
              className="w-full pl-13 pr-12 py-4 bg-slate-800 border-2 border-slate-700 focus:border-amber-500 rounded-2xl text-lg text-white placeholder-slate-400 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={resetFilters}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold bg-slate-700 px-2 py-1 rounded-md"
              >
                Clear
              </button>
            )}
          </div>

          {/* Voice Search Button with Language Selection */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              id="voice-assistant-mic-btn"
              onClick={handleVoiceSearchToggle}
              className={`px-5 py-4 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isVoiceListening
                  ? "bg-red-500 text-white animate-pulse shadow-red-900/50"
                  : "bg-slate-800 hover:bg-slate-700 text-amber-300 border-2 border-amber-500/40"
              }`}
              title="Speak in your native language"
            >
              <Mic className={`w-5 h-5 ${isVoiceListening ? "animate-bounce text-white" : "text-amber-400"}`} />
              <span>
                {isVoiceListening
                  ? `Listening (${SUPPORTED_SPEECH_LANGUAGES.find((l) => l.code === speechLanguage)?.name || "Auto"})...`
                  : "Voice Search"}
              </span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-3 py-3.5 flex items-center space-x-1.5 text-xs text-amber-300">
              <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Lang:</span>
              <select
                value={speechLanguage}
                onChange={(e) => setSpeechLanguage(e.target.value)}
                className="bg-transparent text-amber-300 font-bold outline-none cursor-pointer text-xs"
              >
                {SUPPORTED_SPEECH_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search intent trigger button */}
          <button
            type="button"
            onClick={() => handleAISearch(searchQuery)}
            disabled={isParsingAI || !searchQuery.trim()}
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isParsingAI ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span>Ask Gemini AI</span>
          </button>
        </div>

        {/* Auto-detected notification banner */}
        {autoDetectedLangNotice && (
          <div className="p-3 bg-amber-950/80 border-2 border-amber-500/70 rounded-2xl text-amber-200 text-xs flex items-center justify-between space-x-2 animate-fadeIn shadow-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
              <span className="font-medium">{autoDetectedLangNotice}</span>
            </div>
            <button
              onClick={() => setAutoDetectedLangNotice(null)}
              className="text-amber-400/80 hover:text-amber-200 text-[11px] font-bold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Multilingual Voice Preset Chips for Quick 1-Tap Search */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-400 font-semibold mr-1">Voice language:</span>
          {[
            { code: "auto", label: "✨ Auto-Detect (Auto)" },
            { code: "hi-IN", label: "🇮🇳 हिन्दी (Hindi)" },
            { code: "ta-IN", label: "🇮🇳 தமிழ் (Tamil)" },
            { code: "te-IN", label: "🇮🇳 తెలుగు (Telugu)" },
            { code: "bn-IN", label: "🇮🇳 বাংলা (Bengali)" },
            { code: "mr-IN", label: "🇮🇳 मराठी (Marathi)" },
            { code: "es-ES", label: "🇪🇸 Español" },
            { code: "en-IN", label: "🇬🇧 English" },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setSpeechLanguage(l.code);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer ${
                speechLanguage === l.code
                  ? "bg-amber-500/20 text-amber-300 border-amber-400 font-bold shadow-sm"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* AI Intent Feedback Badge */}
        {aiIntentResult && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-2xl flex items-center justify-between animate-fadeIn text-sm">
            <div className="flex items-center space-x-2 text-amber-200">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                <strong className="text-amber-300">Gemini Intent:</strong> {aiIntentResult.summary}
              </span>
            </div>
            <button
              onClick={() => setAiIntentResult(null)}
              className="text-xs text-amber-400 hover:underline font-semibold ml-4"
            >
              Reset AI Filter
            </button>
          </div>
        )}

        {/* Quick Radius & Tag Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Proximity Radius:</span>
            </span>
            <div className="flex items-center space-x-1">
              {[1, 3, 5, 10, 20].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    radiusKm === r
                      ? "bg-amber-500 text-slate-950 shadow-md font-mono"
                      : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Barter & Apprentice quick toggles */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBarterOnly(!barterOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                barterOnly
                  ? "bg-amber-500/30 text-amber-200 border-amber-400 shadow-md"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Barter Friendly</span>
            </button>

            <button
              onClick={() => setApprenticeOnly(!apprenticeOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                apprenticeOnly
                  ? "bg-purple-500/30 text-purple-200 border-purple-400 shadow-md"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Youth Apprenticeship</span>
            </button>
          </div>

          {/* Layout View Mode Switcher on Desktop */}
          <div className="hidden lg:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "split"
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Split Map & Feed
            </button>
            <button
              onClick={() => setViewMode("feed")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "feed"
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Feed Only
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "map"
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Radar Map
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills - Clean Flex Wrap for No Horizontal Scrolling */}
      <div className="flex flex-wrap items-center gap-2">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
              selectedCategory === tab.id
                ? "bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-900/20"
                : "bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Result Status Header */}
      <div className="flex items-center justify-between text-sm text-slate-400 px-1">
        <div>
          Showing <span className="text-amber-300 font-bold">{finalFilteredListings.length}</span>{" "}
          senior artisans & homemade goods within{" "}
          <span className="text-amber-300 font-bold">{radiusKm} km</span>
        </div>
        {(searchQuery || selectedCategory !== "all" || barterOnly || apprenticeOnly) && (
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1 text-xs text-amber-400 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset all filters</span>
          </button>
        )}
      </div>

      {/* Main Responsive Layout: Split or Single View */}
      {viewMode === "split" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Map */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <InteractiveMap
              userLocation={userLocation}
              listings={finalFilteredListings}
              selectedListing={selectedListingForMap}
              onSelectListing={(l) => setSelectedListingForMap(l)}
              onContactProvider={onContactProvider}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              onUpdateUserLocation={onUpdateUserLocation}
              events={events}
              onSelectEvent={onSelectEvent}
              onOpenMeetupModal={onOpenMeetupModal}
            />
          </div>

          {/* Right Column: Listing Cards Feed */}
          <div className="lg:col-span-7 space-y-6">
            {/* Upcoming Marketplace Meetups Highlight Card */}
            {events.length > 0 && onOpenMeetupModal && (
              <div className="p-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl flex-shrink-0">
                    🎪
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                        Community Meetup & Bazaar
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        {events[0].registeredShops.length}/{events[0].stallsCapacity} STALLS BOOKED
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {events[0].title}
                    </h4>
                    <p className="text-xs text-slate-300">
                      📍 {events[0].locationName || events[0].location.neighborhood} • ⏰ {events[0].date} ({events[0].time})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectEvent ? onSelectEvent(events[0]) : onOpenMeetupModal()}
                  className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer transition-all hover:scale-105 self-end sm:self-center"
                >
                  <span>Register Shop / View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {finalFilteredListings.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl space-y-4">
                <Compass className="w-12 h-12 text-amber-400 mx-auto opacity-70 animate-spin-slow" />
                <h3 className="text-xl font-bold text-amber-100 font-serif">
                  No artisans found within {radiusKm} km
                </h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  Try expanding your proximity radar to 10 km or searching for a different craft category.
                </p>
                <button
                  onClick={() => setRadiusKm(10)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm shadow-md"
                >
                  Expand Radar to 10 km
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {finalFilteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onContactProvider={onContactProvider}
                    onEditListing={onEditListing}
                    isOwner={currentUserId === listing.providerId}
                    onSelectOnMap={(l) => {
                      setSelectedListingForMap(l);
                      window.scrollTo({ top: 150, behavior: "smooth" });
                    }}
                    largeTextMode={largeTextMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "feed" ? (
        /* Feed Only Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {finalFilteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onContactProvider={onContactProvider}
              onEditListing={onEditListing}
              isOwner={currentUserId === listing.providerId}
              largeTextMode={largeTextMode}
            />
          ))}
        </div>
      ) : (
        /* Map Only Mode */
        <div className="w-full">
          <InteractiveMap
            userLocation={userLocation}
            listings={finalFilteredListings}
            selectedListing={selectedListingForMap}
            onSelectListing={(l) => setSelectedListingForMap(l)}
            onContactProvider={onContactProvider}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            onUpdateUserLocation={onUpdateUserLocation}
            events={events}
            onSelectEvent={onSelectEvent}
            onOpenMeetupModal={onOpenMeetupModal}
          />
        </div>
      )}
        </>
      )}
    </div>
  );
};
